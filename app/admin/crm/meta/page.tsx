'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // Added useCallback
import { useAuth } from '@/hooks/useAuth';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, MediaPreview, InlineMediaPreview, getFilenameFromUrl, TemplateSelector, type WhatsAppTemplate, ChatStatusBadge, type ChatStatus } from '@/components/admin/crm';
import { calculateChatStatus, getChatStatusInfo, getChatStatusOptions, getStatusPriority } from '@/lib/utils/chatStatus';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';
import { FormModal } from '@/components/admin/crm';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import LanguageSelector from './_components/LanguageSelector'; // Imported new component
import SpellCheckTextarea from '@/components/admin/crm/SpellCheckTextarea';

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
    source?: string;
    sample?: any;
  }>;
};

// --- Types ---
type ConversationRow = {
  _id: string;
  leadId: string;
  leadNumber?: number | string;
  name?: string | null;
  hasLead?: boolean;
  phoneNumber: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
  lastDirection?: 'inbound' | 'outbound' | string;
  lastInboundAt?: string;  // Timestamp of last user (inbound) message
  unreadCount?: number;
  status?: string;
  labels?: string[];
  assignedToUserId?: string;
  source?: string;
  chatStatus?: ChatStatus; // Manual override status
  isBlocked?: boolean;
  blockedReason?: string;
};

type Message = {
  _id: string;
  leadId: string;
  messageContent: string;
  messageType?: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  media?: {
    kind?: 'image' | 'video' | 'document' | 'audio' | 'sticker';
    url?: string;
    fileName?: string;
    mimeType?: string;
  };
  sentByLabel?: string;
  senderDisplayName?: string;
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

/**
 * Convert S3 URLs to proxied URLs for authenticated access
 * S3 bucket has "Block Public Access" enabled, so we need to proxy through API
 */
function getProxiedMediaUrl(url: string, authToken: string | null): string {
  if (!url) return url;
  
  // Check if it's an S3 URL (our bucket)
  const isS3Url = url.includes('.s3.') && url.includes('.amazonaws.com');
  
  if (isS3Url && authToken) {
    // Proxy through our API which will generate a signed URL and fetch the content
    return `/api/admin/crm/media/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(authToken)}`;
  }
  
  return url;
}

export default function MetaInboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuth();
  const { fetch: crmFetch, loading: crmLoading, error: crmError } = useCRM({ token });

  // If this page is rendered from the QR route, we must use a separate pipeline.
  // We detect that either by pathname (/admin/crm/qr) or a query string provider=qr.
  const providerScope = useMemo(() => {
    try {
      if (typeof window === 'undefined') return 'meta';
      const url = new URL(window.location.href);
      const p = (url.searchParams.get('provider') || '').trim();
      if (p === 'qr') return 'qr';
      if (pathname?.includes('/admin/crm/qr')) return 'qr';
      return 'meta';
    } catch {
      return pathname?.includes('/admin/crm/qr') ? 'qr' : 'meta';
    }
  }, [pathname]);

  // State
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [conversationsTotal, setConversationsTotal] = useState(0);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageLimit, setMessageLimit] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState<ChatStatus | 'all'>('all'); // Chat status filter
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last_week'>('all'); // Date filter
  const [archivedPhones, setArchivedPhones] = useState<Set<string>>(new Set()); // Archived conversations
  const [showArchived, setShowArchived] = useState(false); // Toggle archived view
  const [composerText, setComposerText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video' | 'document' } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // Added for sidebar toggle
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false); // Added for attachment popup
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false); // Dropdown for header
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // Lightbox for media zoom
  const [avatarZoom, setAvatarZoom] = useState(false); // Avatar zoom modal

  // Diagnostics UI state
  const [diagPhone, setDiagPhone] = useState('');
  const [diagResult, setDiagResult] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [lastRawEvents, setLastRawEvents] = useState<any[]>([]);
  const [expandDiagDetails, setExpandDiagDetails] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // AI State
  const [isBotMode, setIsBotMode] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true); // Auto-correction toggle
  const [lastCorrectionTime, setLastCorrectionTime] = useState(0);
  const autoCorrectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Spell check suggestions popup state
  const [spellSuggestions, setSpellSuggestions] = useState<{ 
    word: string; 
    suggestions: string[]; 
    position: { x: number; y: number } 
  } | null>(null);

  // 24h window countdown
  const [windowAnchorMs, setWindowAnchorMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Footer toolboxes
  const [toolsOpen, setToolsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  // Bulk action modals
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignValue, setBulkAssignValue] = useState('');
  const [bulkLabelsOpen, setBulkLabelsOpen] = useState(false);
  const [bulkLabelsSelected, setBulkLabelsSelected] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false); // Toggle blocked view
  const [actionModal, setActionModal] = useState<null | {
    type: 'quick' | 'schedule' | 'template' | 'delay' | 'repeat' | 'chatbot_flow';
  }>(null);
  const [delayConfig, setDelayConfig] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  // Chatbot flow state
  const [chatbotFlows, setChatbotFlows] = useState<{_id:string;name:string;description?:string;enabled?:boolean;nodes?:any[]}[]>([]);
  const [chatbotFlowsLoading, setChatbotFlowsLoading] = useState(false);
  const [chatbotFlowAssigning, setChatbotFlowAssigning] = useState<string | null>(null);
  const [repeatConfig, setRepeatConfig] = useState({
    mode: 'daily' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customText: '',
  });
  // Schedule/Delay/Repeat state
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);

  // Quick Replies State - persisted to localStorage
  const defaultQuickReplies = [
    { id: '1', text: 'Hello! How can I help you today?' },
    { id: '2', text: 'Thank you for your interest in Swar Yoga.' },
    { id: '3', text: 'Can we schedule a call for tomorrow?' },
  ];
  const [quickReplies, setQuickReplies] = useState<Array<{id: string; text: string}>>(defaultQuickReplies);
  const [newQuickReply, setNewQuickReply] = useState('');

  // Forward media state
  const [forwardMedia, setForwardMedia] = useState<{ url: string; kind: string; caption?: string } | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardBusy, setForwardBusy] = useState(false);

  // Load archived conversations from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_archived_phones');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setArchivedPhones(new Set(parsed));
        } catch { /* ignore */ }
      }
    }
  }, []);

  // Save archived conversations to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_archived_phones', JSON.stringify([...archivedPhones]));
    }
  }, [archivedPhones]);

  // Archive/Unarchive a conversation by phone number
  const toggleArchive = useCallback((phoneNumber: string) => {
    setArchivedPhones(prev => {
      const next = new Set(prev);
      if (next.has(phoneNumber)) {
        next.delete(phoneNumber);
      } else {
        next.add(phoneNumber);
        // If we archived the currently selected, deselect
        if (selected?.phoneNumber === phoneNumber) {
          setSelected(null);
          setMessages([]);
        }
      }
      return next;
    });
  }, [selected]);

  // Load quick replies from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_quick_replies');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuickReplies(parsed);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, []);

  // Save quick replies to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_quick_replies', JSON.stringify(quickReplies));
    }
  }, [quickReplies]);

  // Monthly Expense Summary for header widget
  const [monthlyExpenseSummary, setMonthlyExpenseSummary] = useState<{
    total: number;
    marketing: number;
    utility: number;
    whatsapp_api: number;
    messagesSent: number;
  } | null>(null);
  
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
  const pendingPhoneRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Right Sidebar state
  const [sidebarData, setSidebarData] = useState({
    status: '',
    labels: [] as string[],
    notes: '',
    followUpDate: '',
    assignedTo: '',
  });
  const [savingSidebar, setSavingSidebar] = useState(false);

  // Admin Users for assignment (loaded once)
  const [adminUsers, setAdminUsers] = useState<Array<{ userId: string; name: string; email: string }>>([]);

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

    // Auto-select from ?phone= query param
    try {
      const url = new URL(window.location.href);
      const phoneParam = url.searchParams.get('phone')?.trim();
      if (phoneParam) {
        // Set a pending phone to auto-select once conversations load
        pendingPhoneRef.current = phoneParam.replace(/\D/g, '');
        // Clean the URL so it doesn't persist on refresh
        url.searchParams.delete('phone');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

    // Auto-refresh every 30 seconds. Don't recreate the interval on every keystroke.
    const timer = setInterval(() => {
      loadConversations(searchQuery, true);
    }, 30000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load admin users for assignment dropdown (once on mount)
  useEffect(() => {
    if (!token) return;
    
    const fetchAdminUsers = async () => {
      try {
        const res = await fetch('/api/admin/auth/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const users = data?.data || data?.users || [];
          setAdminUsers(users.map((u: any) => ({
            userId: u.userId || u._id || '',
            name: u.name || u.email || 'Unknown',
            email: u.email || '',
          })));
        }
      } catch (e) {
        console.warn('Failed to load admin users:', e);
      }
    };
    
    fetchAdminUsers();
  }, [token]);

  // Load monthly expense summary for header widget
  useEffect(() => {
    if (!token) return;
    
    const fetchMonthlyExpenses = async () => {
      try {
        const res = await fetch('/api/admin/crm/analytics/whatsapp?view=overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.overview) {
            const { expenses, messages } = data.data.overview;
            setMonthlyExpenseSummary({
              total: expenses?.total || 0,
              marketing: expenses?.marketing || 0,
              utility: expenses?.utility || 0,
              whatsapp_api: expenses?.whatsapp_api || 0,
              messagesSent: messages?.sent || 0,
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load monthly expenses:', e);
      }
    };
    
    fetchMonthlyExpenses();
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
      loadMessages(c.leadId || c._id || c.phoneNumber, true);
    }, 10000); // Poll messages every 10s when active (silent mode)

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selected?._id]);

  // 1. Diagnostics logic
  const runDiagnostics = async (targetPhone?: string) => {
    const phone = targetPhone || diagPhone;
    if (!phone) {
      setDiagError('Enter a phone number');
      return;
    }
    setIsDiagnosing(true);
    setDiagError(null);
    try {
      // Normalizing phone for diagnostics too
      const normalized = phone.replace(/\D/g, '');
      const finalPhone = normalized.length === 10 ? '91' + normalized : normalized;
      
      const res = await crmFetch(`/api/admin/crm/diagnostics/meta-inbox?phone=${finalPhone}&lastEvents=20`, { method: 'GET' });
      if (res) {
        setDiagResult(res);
        if (res.events) {
           setLastRawEvents(res.events);
        }
      } else {
        setDiagError('Diagnostics failed');
      }
    } catch (err: any) {
      console.error('Diagnostics failed', err);
      setDiagError(err.message || 'Diagnostics failed');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleManualDiag = () => runDiagnostics(diagPhone);

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

  const loadConversations = async (q = '', silent = false) => {
    try {
      const data = await crmFetch('/api/admin/crm/conversations', {
        params: { q, limit: 500, provider: providerScope },
        silent, // Pass silent flag to crmFetch
      });
      if (data?.conversations) {
        setConversations(data.conversations);
        if (typeof data.total === 'number') setConversationsTotal(data.total);

        // Auto-select conversation from ?phone= query param
        if (pendingPhoneRef.current) {
          const target = pendingPhoneRef.current;
          pendingPhoneRef.current = null; // Consume once
          const match = (data.conversations as ConversationRow[]).find(c => {
            const p = (c.phoneNumber || '').replace(/\D/g, '');
            return p === target || p.endsWith(target.slice(-10));
          });
          if (match) {
            handleSelectConversation(match);
          }
        } else if (!silent && data.conversations.length > 0) {
          // Auto-select topmost conversation on initial load (not on silent refresh)
          const first = data.conversations[0] as ConversationRow;
          if (!selected) {
            handleSelectConversation(first);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (id?: string, silent = false) => {
    if (!id) return;
    if (!silent) setLoadingMessages(true);
    try {
      // Determine if id is an ObjectId or phoneNumber
      const isObjectId = id.length === 24 && /^[0-9a-fA-F]+$/.test(id);
      const params: any = isObjectId ? { leadId: id } : { phoneNumber: id };
      params.provider = providerScope;
      
      const data = await crmFetch(`/api/admin/crm/messages`, { 
        params,
        silent, // Pass silent flag to crmFetch
      });
      if (data?.messages) {
        // Reverse needed so oldest is at top (standard chat view)
        const newMsgs = [...data.messages].reverse();
        
        // Only trigger scroll to bottom if new messages arrived
        const hasNew = newMsgs.length !== messages.length || 
                     (newMsgs.length > 0 && newMsgs[newMsgs.length-1]._id !== messages[messages.length-1]?._id);
        
        setMessages(newMsgs);
        if (hasNew) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // Handle right-click on misspelled words for spell suggestions
  const handleSpellCheck = useCallback(async (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const text = target.value;
    
    // Get the word at cursor position
    const cursorPos = target.selectionStart || 0;
    const words = text.split(/\s+/);
    let charCount = 0;
    let selectedWord = '';
    
    for (const word of words) {
      if (cursorPos >= charCount && cursorPos <= charCount + word.length) {
        selectedWord = word.replace(/[.,!?;:'"()]/g, '');
        break;
      }
      charCount += word.length + 1;
    }
    
    if (selectedWord && selectedWord.length > 2) {
      try {
        const res = await crmFetch('/api/admin/crm/spell-suggest', {
          method: 'POST',
          body: JSON.stringify({ word: selectedWord }),
        });
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSpellSuggestions({
            word: selectedWord,
            suggestions: data.suggestions,
            position: { x: e.clientX, y: e.clientY },
          });
        }
      } catch (err) {
        console.error('Spell check error:', err);
      }
    }
  }, [crmFetch]);

  // Apply spelling correction
  const applySuggestion = useCallback((suggestion: string) => {
    if (!spellSuggestions) return;
    setComposerText(prev => prev.replace(new RegExp(`\\b${spellSuggestions.word}\\b`, 'gi'), suggestion));
    setSpellSuggestions(null);
  }, [spellSuggestions]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = () => setSpellSuggestions(null);
    if (spellSuggestions) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [spellSuggestions]);

  // Auto-correction handler (debounced)
  const handleAutoCorrect = useCallback(async (text: string) => {
    if (!autoCorrectEnabled || !text.trim()) return;
    
    // Only auto-correct after a space or punctuation (word boundary)
    const lastChar = text.slice(-1);
    if (!/[\s.,!?;:]/.test(lastChar)) return;
    
    // Debounce - don't correct too frequently
    const now = Date.now();
    if (now - lastCorrectionTime < 500) return;
    
    try {
      const res = await fetch('/api/admin/crm/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, mode: 'autocorrect' })
      });
      const data = await res.json();
      
      if (data.success && data.changed && data.result) {
        setComposerText(data.result);
        setLastCorrectionTime(now);
      }
    } catch (err) {
      // Silent fail for auto-correction
      console.debug('Auto-correct failed:', err);
    }
  }, [autoCorrectEnabled, lastCorrectionTime, token]);

  // Debounced auto-correction on text change
  const handleComposerChange = useCallback((newText: string) => {
    setComposerText(newText);
    
    // Clear existing timeout
    if (autoCorrectTimeoutRef.current) {
      clearTimeout(autoCorrectTimeoutRef.current);
    }
    
    // Set new timeout for auto-correction
    if (autoCorrectEnabled && newText.trim()) {
      autoCorrectTimeoutRef.current = setTimeout(() => {
        handleAutoCorrect(newText);
      }, 300);
    }
  }, [autoCorrectEnabled, handleAutoCorrect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCorrectTimeoutRef.current) {
        clearTimeout(autoCorrectTimeoutRef.current);
      }
    };
  }, []);

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

    // File size limit (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File too large. Maximum size: 25MB`);
      return;
    }

    try {
      setUploadProgress(0);
      
      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              const url = result?.data?.url || result?.url;
              if (url) {
                resolve(url);
              } else {
                reject(new Error('Upload succeeded but URL not returned'));
              }
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/admin/crm/upload/s3');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      console.log('[Meta] 📤 Media uploaded to S3:', uploadedUrl);
      setAttachedMedia({
        url: uploadedUrl,
        type: uploadType
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Upload failed');
    } finally {
      setUploadProgress(null);
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
        // Common symbols used in Indian espiritual / Yoga context
        appendToComposer(' 🕉 🔱 ☸ 🙏✨ ★ ✓ ₹ • →');
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

  const openAction = (type: 'quick' | 'schedule' | 'template' | 'delay' | 'repeat' | 'chatbot_flow') => {
    setQuickActionsOpen(false);
    setActionModal({ type });
    if (type === 'chatbot_flow') {
      loadChatbotFlows();
    }
  };

  const loadChatbotFlows = async () => {
    if (!token) return;
    setChatbotFlowsLoading(true);
    try {
      const res = await fetch('/api/admin/crm/chatbot-flows?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setChatbotFlows(Array.isArray(json?.data?.flows) ? json.data.flows : []);
    } catch {
      setChatbotFlows([]);
    } finally {
      setChatbotFlowsLoading(false);
    }
  };

  const assignChatbotFlow = async (flowId: string) => {
    if (!token || !selected) return;
    const leadId = selected.leadId || selected._id;
    if (!leadId) { alert('No lead selected'); return; }
    setChatbotFlowAssigning(flowId);
    try {
      // Call the new start API that assigns AND sends the first message immediately
      const res = await fetch(`/api/admin/crm/chatbot-flows/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId, leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        alert(`✅ Flow started! ${data.sentCount || 0} message(s) sent immediately to the customer.`);
        closeActionModal();
        // Refresh messages to show the sent messages
        const phoneOrLead = selected.leadId || selected.phoneNumber || selected._id;
        if (phoneOrLead) loadMessages(phoneOrLead);
      } else {
        alert(data.error || 'Failed to start flow');
      }
    } catch (err) {
      alert('Failed to start flow');
    } finally {
      setChatbotFlowAssigning(null);
    }
  };

  const removeChatbotFlow = async () => {
    if (!token || !selected) return;
    const leadId = selected.leadId || selected._id;
    if (!leadId) return;
    setChatbotFlowAssigning('__remove__');
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { chatbotFlowState: null } }),
      });
      if (res.ok) {
        alert('✅ Chatbot flow removed from this conversation.');
        closeActionModal();
      } else {
        alert('Failed to remove flow');
      }
    } catch {
      alert('Failed to remove flow');
    } finally {
      setChatbotFlowAssigning(null);
    }
  };

  const closeActionModal = () => setActionModal(null);

  const handleSelectConversation = (conv: ConversationRow) => {
    setSelected(conv);
    setMessageLimit(5);
    loadMessages(conv.leadId || conv._id || conv.phoneNumber);
    
    // Map legacy status values to new funnel stages
    const legacyStatusMap: Record<string, string> = {
      'lead': 'new_lead', 'hot': 'interested', 'prospect': 'contacted', 'customer': 'enrolled',
    };
    const rawStatus = (conv.status || 'new_lead').toLowerCase();
    const mappedStatus = legacyStatusMap[rawStatus] || rawStatus;

    // Reset sidebar data based on selected conversation
    setSidebarData({
      status: mappedStatus,
      labels: conv.labels || [],
      notes: '', // Notes need a separate fetch usually
      followUpDate: '', // Follow-ups need a separate fetch usually
      assignedTo: conv.assignedToUserId || '',
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

  // Handle chat status change (close/reopen) - works for selected or any leadId
  const handleChatStatusChange = async (newStatus: ChatStatus, targetLeadId?: string) => {
    const leadId = targetLeadId || selected?.leadId;
    if (!leadId) return;
    try {
      await crmFetch(`/api/admin/crm/leads/${leadId}/chat-status`, {
        method: 'PATCH',
        body: { chatStatus: newStatus }
      });
      
      // Update the selected conversation state if it matches
      if (selected?.leadId === leadId) {
        setSelected(prev => prev ? { ...prev, chatStatus: newStatus } : null);
      }
      
      // Update the conversations list
      setConversations(prev => prev.map(c => 
        c.leadId === leadId ? { ...c, chatStatus: newStatus } : c
      ));
    } catch (err) {
      console.error('Failed to update chat status:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!selected) return;
    // Block check: prevent sending to blocked users
    if (selected.isBlocked) {
      alert('Cannot send messages to a blocked user. Unblock them first.');
      return;
    }
    // Allow sending media-only or text-only messages
    if (!composerText.trim() && !attachedMedia) return;
    if (sending) return;

    setSending(true);
    try {
      const leadId = selected.leadId;
      const phoneNumber = selected.phoneNumber || selected._id;
      
      await crmFetch(`/api/admin/crm/whatsapp/send`, {
        method: 'POST',
        body: {
          leadId,
          phoneNumber,
          messageContent: composerText.trim() || `[${attachedMedia?.type || 'media'}]`,
          media: attachedMedia ? {
            kind: attachedMedia.type,
            url: attachedMedia.url,
          } : undefined,
          // When rendered from /admin/crm/qr we want QR provider pipeline.
          provider: providerScope,
        },
      });
      setComposerText('');
      setAttachedMedia(null);

      // Auto-close chat status after admin replies
      if (selected.leadId) {
        try {
          await crmFetch(`/api/admin/crm/leads/${selected.leadId}/chat-status`, {
            method: 'PATCH',
            body: { chatStatus: 'closed' }
          });
          // Update local state
          setSelected(prev => prev ? { ...prev, chatStatus: 'closed' } : null);
          setConversations(prev => prev.map(c =>
            c.leadId === selected.leadId ? { ...c, chatStatus: 'closed' } : c
          ));
        } catch (e) {
          // Non-fatal: status update failure shouldn't block messaging
          console.warn('Auto-close status update failed:', e);
        }
      }

      // Refresh messages and conversations
      await Promise.all([
        loadMessages(leadId || phoneNumber),
        loadConversations(searchQuery)
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ================================================================
  // MEDIA DOWNLOAD / FORWARD HANDLERS
  // ================================================================
  const handleMediaDownload = async (mediaUrl: string, fileName?: string) => {
    try {
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `download-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  const handleForwardMedia = async (targetLeadId: string, targetPhone: string) => {
    if (!forwardMedia || forwardBusy) return;
    setForwardBusy(true);
    try {
      await crmFetch('/api/admin/crm/whatsapp/send', {
        method: 'POST',
        body: {
          leadId: targetLeadId,
          phoneNumber: targetPhone,
          messageContent: forwardMedia.caption || `[${forwardMedia.kind}]`,
          media: { kind: forwardMedia.kind, url: forwardMedia.url },
          provider: providerScope,
        },
      });
      setForwardMedia(null);
      setForwardSearch('');
      alert('Media forwarded successfully!');
    } catch (err) {
      console.error('Forward failed:', err);
      alert('Failed to forward media');
    } finally {
      setForwardBusy(false);
    }
  };

  // ================================================================
  // BULK ACTION HANDLERS
  // ================================================================
  const getSelectedLeadIds = (): string[] => {
    return filteredConversations
      .filter((c) => bulkSelected[c._id])
      .map((c) => c.leadId)
      .filter(Boolean);
  };

  const handleBulkMarkRead = async () => {
    const toMark = filteredConversations.filter((c) => bulkSelected[c._id]);
    if (toMark.length === 0) return;
    setBulkActionLoading(true);
    try {
      // Batch all mark-read calls, then reload once
      await Promise.all(
        toMark.map((c) =>
          crmFetch('/api/admin/crm/messages', {
            method: 'PUT',
            body: { leadId: c.leadId, phoneNumber: c.phoneNumber, action: 'markThreadAsRead' },
          })
        )
      );
      loadConversations(searchQuery);
      bulkClear();
    } catch (err) {
      console.error('Bulk mark read failed:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    const leadIds = getSelectedLeadIds();
    if (leadIds.length === 0 || !bulkAssignValue) return;
    setBulkActionLoading(true);
    try {
      await crmFetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        body: { leadIds, assignedToUserId: bulkAssignValue },
      });
      loadConversations(searchQuery);
      bulkClear();
      setBulkAssignOpen(false);
      setBulkAssignValue('');
    } catch (err) {
      console.error('Bulk assign failed:', err);
      alert('Failed to bulk assign leads');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkLabels = async () => {
    const leadIds = getSelectedLeadIds();
    if (leadIds.length === 0 || bulkLabelsSelected.length === 0) return;
    setBulkActionLoading(true);
    try {
      await crmFetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        body: { leadIds, addLabels: bulkLabelsSelected },
      });
      loadConversations(searchQuery);
      bulkClear();
      setBulkLabelsOpen(false);
      setBulkLabelsSelected([]);
    } catch (err) {
      console.error('Bulk labels failed:', err);
      alert('Failed to bulk update labels');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkBlock = async () => {
    const leadIds = getSelectedLeadIds();
    if (leadIds.length === 0) return;
    const confirmed = confirm(`Block ${leadIds.length} conversation(s)? They will be moved to the Blocked section and will not receive messages.`);
    if (!confirmed) return;
    setBulkActionLoading(true);
    try {
      await crmFetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        body: { leadIds, isBlocked: true, blockedReason: 'manual' },
      });
      loadConversations(searchQuery);
      bulkClear();
    } catch (err) {
      console.error('Bulk block failed:', err);
      alert('Failed to block leads');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    const leadIds = getSelectedLeadIds();
    if (leadIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      await crmFetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        body: { leadIds, isBlocked: false },
      });
      loadConversations(searchQuery);
      bulkClear();
    } catch (err) {
      console.error('Bulk unblock failed:', err);
      alert('Failed to unblock leads');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBlockSingle = async (leadId: string, block: boolean, reason?: string) => {
    try {
      await crmFetch('/api/admin/crm/leads/bulk-update', {
        method: 'POST',
        body: {
          leadIds: [leadId],
          isBlocked: block,
          blockedReason: block ? (reason || 'manual') : undefined,
        },
      });
      loadConversations(searchQuery);
      if (selected?.leadId === leadId && block) {
        setSelected(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Block/unblock failed:', err);
      alert('Failed to block/unblock lead');
    }
  };

  const handleSaveSidebar = async () => {
    if (!selected || !selected.leadId) return;
    setSavingSidebar(true);
    try {
      // 1. Update Lead Status, Labels, and Assignment
      const updateLeadPromise = crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
        method: 'PUT',
        body: {
          status: sidebarData.status,
          labels: sidebarData.labels,
          assignedToUserId: sidebarData.assignedTo || undefined,
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

  // Scheduled/Delayed/Repeat message handler
  const createScheduledMessage = async (mode: 'schedule' | 'delay' | 'repeat') => {
    if (!selected) {
      alert('No conversation selected');
      return;
    }
    
    const text = scheduleMessage.trim() || composerText.trim();
    if (!text) {
      alert('Please enter a message to send');
      return;
    }
    
    try {
      setScheduleBusy(true);
      
      const body: any = {
        name: mode === 'schedule' 
          ? 'Scheduled Message' 
          : mode === 'delay' 
            ? 'Delayed Message' 
            : 'Recurring Message',
        messageType: 'text',
        messageContent: text,
        targetType: 'leadIds',
        targetLeadIds: [selected.leadId || selected._id],
        timezone: 'Asia/Kolkata',
      };
      
      if (mode === 'schedule') {
        if (!scheduleAt) {
          alert('Please select a date and time');
          setScheduleBusy(false);
          return;
        }
        body.sendAt = new Date(scheduleAt).toISOString();
      } else if (mode === 'delay') {
        const totalMinutes = 
          (delayConfig.days * 24 * 60) + 
          (delayConfig.hours * 60) + 
          delayConfig.minutes + 
          Math.ceil(delayConfig.seconds / 60);
        if (totalMinutes <= 0) {
          alert('Please set a delay duration');
          setScheduleBusy(false);
          return;
        }
        body.delayMinutes = totalMinutes;
      } else if (mode === 'repeat') {
        body.recurrence = { 
          frequency: repeatConfig.mode,
          customRule: repeatConfig.mode === 'custom' ? repeatConfig.customText : undefined
        };
        // For repeat, also need a first run time
        if (!scheduleAt) {
          // Default to 5 minutes from now for first run
          body.delayMinutes = 5;
        } else {
          body.sendAt = new Date(scheduleAt).toISOString();
        }
      }
      
      const res = await fetch('/api/admin/crm/scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(`Message ${mode === 'schedule' ? 'scheduled' : mode === 'delay' ? 'delayed' : 'set to repeat'} successfully!`);
        closeActionModal();
        setScheduleMessage('');
        setScheduleAt('');
        setDelayConfig({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        alert(data.error || `Failed to ${mode} message`);
      }
    } catch (err) {
      console.error(`Error ${mode}ing message:`, err);
      alert(`Failed to ${mode} message`);
    } finally {
      setScheduleBusy(false);
    }
  };

  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Filter blocked vs normal
    if (showBlocked) {
      result = result.filter(c => c.isBlocked);
    } else {
      result = result.filter(c => !c.isBlocked);
    }

    // Filter archived vs active (only when not viewing blocked)
    if (!showBlocked) {
      if (showArchived) {
        result = result.filter(c => archivedPhones.has(c.phoneNumber));
      } else {
        result = result.filter(c => !archivedPhones.has(c.phoneNumber));
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(lower) || 
        c.phoneNumber?.includes(lower)
      );
    }
    
    // Filter by chat status
    if (chatStatusFilter !== 'all') {
      result = result.filter(c => {
        const computedStatus = calculateChatStatus(c.lastMessageAt, c.chatStatus, c.lastInboundAt, c.lastDirection);
        return computedStatus === chatStatusFilter;
      });
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      result = result.filter(c => {
        if (!c.lastMessageAt) return false;
        const msgDate = new Date(c.lastMessageAt).getTime();
        if (dateFilter === 'today') return msgDate >= todayStart.getTime();
        if (dateFilter === 'yesterday') return msgDate >= yesterdayStart.getTime() && msgDate < todayStart.getTime();
        if (dateFilter === 'last_week') return msgDate >= lastWeekStart.getTime();
        return true;
      });
    }
    
    // Sort: unread first (blue dot), then by most recent
    result = [...result].sort((a, b) => {
      const aUnread = (a.unreadCount || 0) > 0 ? 1 : 0;
      const bUnread = (b.unreadCount || 0) > 0 ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread; // Unread always on top
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return result;
  }, [conversations, searchQuery, chatStatusFilter, dateFilter, archivedPhones, showArchived, showBlocked]);

  // Group filtered conversations by date sections
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const groups: { label: string; conversations: ConversationRow[] }[] = [];
    const buckets: Record<string, ConversationRow[]> = {};
    const order: string[] = [];

    for (const conv of filteredConversations) {
      const ts = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
      let label: string;
      if (ts >= todayStart) {
        label = 'Today';
      } else if (ts >= yesterdayStart) {
        label = 'Yesterday';
      } else if (ts > 0) {
        // Format as "Jan 30" or "Dec 15"
        label = new Date(conv.lastMessageAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        label = 'Older';
      }
      if (!buckets[label]) {
        buckets[label] = [];
        order.push(label);
      }
      buckets[label].push(conv);
    }

    for (const label of order) {
      groups.push({ label, conversations: buckets[label] });
    }
    return groups;
  }, [filteredConversations]);

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
        // Reload conversations and auto-select the new lead so user can send message directly
        const phone = values.phoneNumber.replace(/\D/g, '');
        await loadConversations(searchQuery);
        // Find and select the newly created conversation
        setTimeout(() => {
          setConversations(prev => {
            const match = prev.find(c => {
              const p = (c.phoneNumber || '').replace(/\D/g, '');
              return p === phone || p.endsWith(phone.slice(-10));
            });
            if (match) handleSelectConversation(match);
            return prev;
          });
        }, 300);
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
    <div className="bg-[#F9FAF9] text-slate-900 h-screen flex flex-col font-sans overflow-hidden">
      
      {/* Spell suggestions popup */}
      {spellSuggestions && (
        <div 
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[150px]"
          style={{ left: spellSuggestions.position.x, top: spellSuggestions.position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs text-gray-500 px-2 py-1 border-b mb-1">
            Replace &quot;{spellSuggestions.word}&quot; with:
          </div>
          {spellSuggestions.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applySuggestion(s)}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-green-600 hover:text-white rounded transition-colors"
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSpellSuggestions(null)}
            className="block w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="px-3 py-1.5 flex items-center shrink-0 z-20" style={{ background: 'linear-gradient(135deg, #28964F 0%, #34A85A 40%, #45B96B 100%)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        {/* Left: Logo + Platform Tabs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm p-[2px] cursor-pointer hover:bg-white/30 transition-all hover:scale-105 shadow-lg shadow-black/10" onClick={() => router.push('/admin/crm')}>
            <div className="h-full w-full rounded-[10px] bg-white flex items-center justify-center">
              <img src="/logo.png" alt="Swar Yoga" className="h-4.5 w-4.5" />
            </div>
          </div>
          <nav className="flex gap-0.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-0.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white text-[#1E7F43] shadow-md" title="WhatsApp">
              <i className="ph-fill ph-whatsapp-logo text-sm"></i>
              <span className="hidden lg:inline">WhatsApp</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200" title="Messenger" onClick={() => router.push('/admin/crm/messenger')}>
              <i className="ph-fill ph-messenger-logo text-sm"></i>
              <span className="hidden lg:inline">Messenger</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200" title="Instagram" onClick={() => router.push('/admin/crm/instagram')}>
              <i className="ph-fill ph-instagram-logo text-sm"></i>
              <span className="hidden lg:inline">Instagram</span>
            </button>
          </nav>
        </div>

        {/* Center: Nav Tabs */}
        <div className="flex-1 flex justify-center">
          <nav className="flex gap-0.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-0.5">
            {['Leads', 'Followup', 'Sales', 'Messages', 'Analytics', 'Home'].map((tab) => (
              <button 
                key={tab}
                onClick={() => goToTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white text-[#1E7F43] shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/15'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Tools + Expense + AI + Quick icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* CRM Tools Dropdown */}
          <div className="relative">
             <button
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all duration-200 ${
                  toolsDropdownOpen 
                    ? 'bg-white text-[#1E7F43] border-white shadow-md' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white'
                }`}
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
             >
                <i className="ph-bold ph-wrench text-xs"></i>
                <span className="hidden lg:inline uppercase tracking-wider">Tools</span>
                <i className={`ph ph-caret-down text-[8px] transition-transform ${toolsDropdownOpen ? 'rotate-180' : ''}`}></i>
             </button>

             {toolsDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden p-1">
                   {[
                      { label: 'Dashboard', icon: 'ph-chart-bar', href: '/admin/crm/meta-dashboard', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                      { label: 'Chatbots', icon: 'ph-robot', href: '/admin/crm/chatbots', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Templates', icon: 'ph-file-text', href: '/admin/crm/templates', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Broadcasts', icon: 'ph-broadcast', href: '/admin/crm/broadcasts', color: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: 'Automation', icon: 'ph-magic-wand', href: '/admin/crm/automation', color: 'text-purple-600', bg: 'bg-purple-50' },
                   ].map((tool) => (
                      <button 
                        key={tool.label}
                        onClick={() => {
                          setToolsDropdownOpen(false);
                          router.push(tool.href);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg transition-all group text-left"
                      >
                        <div className={`h-6 w-6 rounded-md ${tool.bg} flex items-center justify-center`}>
                           <i className={`ph-bold ${tool.icon} text-sm ${tool.color}`}></i>
                        </div>
                        <span className="text-xs font-[700] text-slate-700 group-hover:text-[#1E7F43]">{tool.label}</span>
                      </button>
                   ))}
                </div>
             )}
          </div>

          {/* Monthly Expense Widget */}
          {monthlyExpenseSummary && (
            <div 
              className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200/60 cursor-pointer hover:bg-rose-100 transition-all"
              onClick={() => router.push('/admin/crm/whatsapp-analytics')}
              title="Click to view full analytics"
            >
              <div className="text-center">
                <div className="text-[8px] font-bold text-rose-400 uppercase">Month</div>
                <div className="text-[12px] font-black text-rose-700 leading-tight">₹{monthlyExpenseSummary.total.toLocaleString()}</div>
              </div>
              <div className="h-5 w-px bg-rose-200/60"></div>
              <div className="flex flex-col text-[8px] leading-tight">
                <div className="flex gap-1">
                  <span className="text-slate-400">Msgs:</span>
                  <span className="font-bold text-slate-600">{monthlyExpenseSummary.messagesSent.toLocaleString()}</span>
                </div>
                <div className="flex gap-1">
                  <span className="text-slate-400">Mktg:</span>
                  <span className="font-bold text-rose-500">₹{monthlyExpenseSummary.marketing.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <button
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all duration-200 ${
              isBotMode 
                ? 'bg-white text-violet-700 border-white shadow-md' 
                : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
            }`}
            onClick={() => setIsBotMode(!isBotMode)}
            title="Toggle AI Auto-Reply"
          >
             <i className={`ph-fill ph-robot text-sm ${isBotMode ? 'animate-pulse' : ''}`}></i>
             <span className="hidden xl:inline uppercase tracking-wider">{isBotMode ? 'AI On' : 'AI Off'}</span>
          </button>

          <button className={`p-1.5 rounded-lg transition-all duration-200 ${showDiagnostics ? 'text-amber-300 bg-white/20' : 'text-white/50 hover:text-white hover:bg-white/15'}`} title="Diagnostics" onClick={() => setShowDiagnostics(!showDiagnostics)}>
            <i className="ph-bold ph-wrench text-sm"></i>
          </button>
          <button className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200" title="Settings" onClick={() => router.push('/admin/crm/chatbots')}>
            <i className="ph-fill ph-gear text-sm"></i>
          </button>
          <button className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200" title="Automation" onClick={() => router.push('/admin/crm/automation')}>
            <i className="ph-fill ph-lightning text-sm"></i>
          </button>
          <button className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200" title="Templates" onClick={() => router.push('/admin/crm/templates')}>
            <i className="ph-fill ph-note text-sm"></i>
          </button>
          <button className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200" title="Broadcast" onClick={() => router.push('/admin/crm/broadcast')}>
            <i className="ph-fill ph-megaphone text-sm"></i>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-[#F9FAF9]">

        {/* LEFT CHAT LIST */}
        <aside className="w-[27rem] border-r border-[#E0EDE6] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #F0F7F2 0%, #FAFCFB 100%)' }}>

          <div className="px-3 py-2.5 border-b border-[#E0EDE6] flex gap-2 items-center shrink-0" style={{ background: 'linear-gradient(180deg, #F0F7F2 0%, #F5FAF7 100%)' }}>
            <div className="relative flex-1 group">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1E7F43] transition-colors text-[12px]"></i>
              <input 
                className="w-full border border-[#E0EDE6] rounded-xl pl-8 pr-3 py-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] transition-all bg-white/80 backdrop-blur-sm placeholder:text-slate-400 font-medium shadow-sm" 
                placeholder="Search name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-xl shadow-lg transition-all duration-200 active:scale-90 hover:scale-105 hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1E7F43, #28964F)', color: 'white' }}
              title="Add New Lead"
              onClick={modal.open}
              type="button"
            >
              <i className="ph ph-plus-bold text-base"></i>
            </button>
          </div>

          {/* Filters Row - Compact Dropdowns */}
          <div className="px-3 py-1.5 border-b border-[#E0EDE6] shrink-0 flex items-center gap-2" style={{ background: 'linear-gradient(180deg, #F5FAF7 0%, #FAFCFB 100%)' }}>
            {/* Status Dropdown */}
            <select
              value={chatStatusFilter}
              onChange={(e) => setChatStatusFilter(e.target.value as typeof chatStatusFilter)}
              className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E7F43] focus:border-[#1E7F43] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="new">✦ New</option>
              <option value="open">✉ Open</option>
              <option value="pending">⏱ Pending</option>
              <option value="overdue">⚠ Overdue</option>
              <option value="closed">✓ Closed</option>
            </select>

            {/* Date Dropdown */}
            <select
              value={showArchived ? 'archived' : showBlocked ? 'blocked' : dateFilter}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'archived') { setShowArchived(true); setShowBlocked(false); setDateFilter('all'); }
                else if (v === 'blocked') { setShowBlocked(true); setShowArchived(false); setDateFilter('all'); }
                else { setShowArchived(false); setShowBlocked(false); setDateFilter(v as typeof dateFilter); }
              }}
              className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E7F43] focus:border-[#1E7F43] cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_week">Last 7 Days</option>
              <option value="archived">Archived{archivedPhones.size > 0 ? ` (${archivedPhones.size})` : ''}</option>
              <option value="blocked">Blocked</option>
            </select>

            {/* Check all + Bulk Actions inline */}
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 select-none ml-1">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300 text-[#1E7F43] focus:ring-[#1E7F43]"
                checked={allChecked}
                onChange={(e) => setAllChecked(e.target.checked)}
              />
              All
            </label>

            {anyChecked && (
              <div className="relative">
                <select
                  className="text-[10px] font-bold border border-[#1E7F43]/30 rounded-lg px-1.5 py-1 bg-[#E6F4EC] text-[#1E7F43] focus:outline-none focus:ring-1 focus:ring-[#1E7F43] cursor-pointer appearance-none pr-5"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'read') handleBulkMarkRead();
                    else if (v === 'assign') { setBulkAssignOpen(!bulkAssignOpen); setBulkLabelsOpen(false); }
                    else if (v === 'labels') { setBulkLabelsOpen(!bulkLabelsOpen); setBulkAssignOpen(false); }
                    else if (v === 'archive') {
                      const toArchive = filteredConversations.filter((c) => bulkSelected[c._id]);
                      setArchivedPhones(prev => {
                        const next = new Set(prev);
                        toArchive.forEach(c => {
                          if (showArchived) next.delete(c.phoneNumber);
                          else next.add(c.phoneNumber);
                        });
                        return next;
                      });
                      bulkClear();
                    }
                    else if (v === 'block') { showBlocked ? handleBulkUnblock() : handleBulkBlock(); }
                  }}
                  disabled={bulkActionLoading}
                >
                  <option value="">{selectedIds.length} sel ▸</option>
                  <option value="read">✓ Mark read</option>
                  <option value="assign">👤 Assign</option>
                  <option value="labels">🏷 Labels</option>
                  <option value="archive">{showArchived ? '↩ Unarchive' : '📦 Archive'}</option>
                  <option value="block">{showBlocked ? '🔓 Unblock' : '🚫 Block'}</option>
                </select>
                <i className="ph ph-caret-down text-[7px] text-[#1E7F43] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            )}

            <span className="ml-auto text-[10px] font-semibold text-slate-400">
              {conversationsTotal > filteredConversations.length ? `${filteredConversations.length}/${conversationsTotal}` : `${filteredConversations.length}`}
            </span>
          </div>

          {/* Bulk Assign sub-panel */}
          {anyChecked && bulkAssignOpen && (
            <div className="px-3 py-1.5 border-b border-slate-200/70 bg-emerald-50/50 shrink-0 flex items-center gap-2">
              <select
                className="flex-1 border border-emerald-200 rounded-lg p-1.5 text-[11px] font-semibold bg-white focus:ring-1 focus:ring-emerald-400 outline-none"
                value={bulkAssignValue}
                onChange={(e) => setBulkAssignValue(e.target.value)}
              >
                <option value="">Select agent...</option>
                {adminUsers.map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkAssignValue || bulkActionLoading}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={handleBulkAssign}
              >
                {bulkActionLoading ? '...' : `Assign ${selectedIds.length}`}
              </button>
            </div>
          )}

          {/* Bulk Labels sub-panel */}
          {anyChecked && bulkLabelsOpen && (
            <div className="px-3 py-1.5 border-b border-slate-200/70 bg-indigo-50/50 shrink-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {labelOptions.map(label => (
                  <label key={label} className="flex items-center gap-1 text-[10px] font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      checked={bulkLabelsSelected.includes(label)}
                      onChange={(e) => {
                        setBulkLabelsSelected(prev =>
                          e.target.checked
                            ? [...prev, label]
                            : prev.filter(l => l !== label)
                        );
                      }}
                    />
                    <span className="text-indigo-800">{label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={bulkLabelsSelected.length === 0 || bulkActionLoading}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={handleBulkLabels}
              >
                {bulkActionLoading ? '...' : `Apply ${bulkLabelsSelected.length} label(s)`}
              </button>
            </div>
          )}

          {showDiagnostics && (
          <div className="px-3 py-1.5 border-b border-slate-200/70 bg-slate-50/50 shrink-0">
            <div>
            {crmError ? (
              <div className="mt-1 text-[11px] font-semibold text-red-700">
                {crmError}
              </div>
            ) : null}

            <div className="mt-1 flex gap-1.5">
              <input
                className="flex-1 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 bg-white"
                placeholder="Phone (e.g. 9075358557)"
                value={diagPhone}
                onChange={(e) => setDiagPhone(e.target.value)}
              />
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={() => runDiagnostics(diagPhone)}
                disabled={!token || isDiagnosing}
                title="Run diagnostics for this phone"
              >
                {isDiagnosing ? '...' : 'Debug'}
              </button>
            </div>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-60"
                onClick={() => {
                  const p = selected?.phoneNumber || '';
                  setDiagPhone(p);
                  runDiagnostics(p);
                }}
                disabled={!token || !selected?.phoneNumber || isDiagnosing}
                title="Debug selected conversation"
              >
                Debug selected
              </button>
              <button
                type="button"
                className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60"
                onClick={() => {
                  setDiagResult(null);
                  setDiagError(null);
                }}
                disabled={isDiagnosing}
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

            {/* Show Details Toggle Button */}
            {diagResult?.ok && (diagResult.messages?.length > 0 || diagResult.webhookEvents?.length > 0) && (
              <button
                onClick={() => setExpandDiagDetails(!expandDiagDetails)}
                className="w-full text-[11px] font-bold text-indigo-600 hover:text-indigo-700 py-1.5 px-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                <span>{expandDiagDetails ? '▼' : '▶'}</span>
                <span>{expandDiagDetails ? 'Hide Details' : 'Show Details'} ({diagResult.counts.messages}M/{diagResult.counts.webhookEvents}E)</span>
              </button>
            )}

            {/* Expanded Diagnostics Details */}
            {diagResult?.ok && expandDiagDetails && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200/70 bg-white p-3">
                {/* Messages Details */}
                {diagResult.messages?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-600 uppercase mb-2">All Messages ({diagResult.messages.length})</div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {diagResult.messages.map((m: any, idx: number) => (
                        <div key={idx} className="text-[9px] bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                          <div className="flex items-center gap-2 justify-between">
                            <span className={`font-bold px-2 py-0.5 rounded text-[8px] ${m.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {m.direction?.toUpperCase()}
                            </span>
                            <span className="text-slate-500 text-[8px]">{m.status || 'pending'}</span>
                            <span className="text-slate-400 text-[8px]">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-slate-700 font-medium line-clamp-2 break-words">{m.messageContent || '(no content)'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Webhook Events Details */}
                {diagResult.webhookEvents?.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-extrabold text-slate-600 uppercase mb-2">All Webhook Events ({diagResult.webhookEvents.length})</div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {diagResult.webhookEvents.map((e: any, idx: number) => (
                        <div key={idx} className="text-[9px] bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                          <div className="flex items-center gap-2 justify-between">
                            <span className={`font-bold px-2 py-0.5 rounded text-[8px] ${e.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {e.kind?.toUpperCase() || 'EVENT'}
                            </span>
                            <span className={`text-[8px] font-bold ${e.ok ? 'text-emerald-600' : 'text-red-600'}`}>{e.ok ? '✓' : '✗'}</span>
                            <span className="text-slate-400 text-[8px]">{new Date(e.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-slate-700 line-clamp-2 break-words">{e.message || e.status || '(no details)'}</div>
                          {e.waMessageId && <div className="text-slate-500 text-[8px]">ID: {e.waMessageId}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {lastRawEvents && lastRawEvents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center px-1">
                  <span>Recent Global Events</span>
                  <span className="text-[9px] lowercase font-normal opacity-60">(Last 20 hits)</span>
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {lastRawEvents.map((evt, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/70 rounded-lg p-2 flex flex-col gap-1 shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-1.5">
                           <span className={`w-1.5 h-1.5 rounded-full ${evt.ok ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                           <span className={`text-[10px] font-black uppercase tracking-tight ${evt.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                             {evt.kind}
                           </span>
                           {evt.source ? (
                             <span
                               className={`text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md border ${
                                 evt.source === 'meta'
                                   ? 'bg-blue-50 text-blue-700 border-blue-100'
                                   : evt.source === 'local'
                                     ? 'bg-amber-50 text-amber-800 border-amber-100'
                                     : 'bg-slate-50 text-slate-700 border-slate-200'
                               }`}
                             >
                               {evt.source}
                             </span>
                           ) : null}
                         </div>
                         <span className="text-[9px] font-bold text-slate-400 shrink-0">
                           {evt.receivedAt ? new Date(evt.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                         </span>
                      </div>
                      <div className="text-[10px] text-slate-700 font-semibold leading-tight line-clamp-2">
                        {evt.message || '-'}
                      </div>
                      {evt.phoneNumber && (
                        <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                          <i className="ph ph-phone text-[8px]"></i>
                          {evt.phoneNumber}
                        </div>
                      )}

                      {(evt?.sample?.phone_number_id || evt?.sample?.display_phone_number || evt?.sample?.url) ? (
                        <div className="text-[9px] font-semibold text-slate-500 leading-tight">
                          {evt?.sample?.phone_number_id ? (
                            <div className="truncate">phone_number_id: {String(evt.sample.phone_number_id)}</div>
                          ) : null}
                          {evt?.sample?.display_phone_number ? (
                            <div className="truncate">display_phone_number: {String(evt.sample.display_phone_number)}</div>
                          ) : null}
                          {evt?.sample?.url ? (
                            <div className="truncate">url: {String(evt.sample.url)}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {crmLoading && conversations.length === 0 ? (
              <div className="p-10 flex justify-center"><LoadingSpinner /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <i className={`ph ${showBlocked ? 'ph-prohibit' : showArchived ? 'ph-archive' : dateFilter !== 'all' ? 'ph-calendar-x' : 'ph-chat-circle-dots'} text-4xl text-slate-300 mb-3`}></i>
                <div className="text-sm font-bold text-slate-400">
                  {showBlocked
                    ? 'No blocked conversations'
                    : showArchived 
                    ? 'No archived conversations' 
                    : dateFilter === 'today' 
                      ? 'No conversations today' 
                      : dateFilter === 'yesterday' 
                        ? 'No conversations yesterday'
                        : dateFilter === 'last_week'
                          ? 'No conversations in the last 7 days'
                          : 'No conversations found'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {showBlocked ? 'Blocked users will appear here when you block them or they send "stop"' : showArchived ? 'Archive conversations using the archive icon on each chat' : 'Try adjusting your filters'}
                </div>
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label}>
                  {/* Date Section Header */}
                  <div className="sticky top-0 z-10 px-4 py-1.5 border-b border-[#E0EDE6]/60 flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #E6F4EC 0%, #F0F7F2 50%, transparent 100%)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, #1E7F43, #28964F)' }}></span>
                    <span className="text-[11px] font-[800] text-slate-500 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[10px] font-medium text-slate-400">({group.conversations.length})</span>
                  </div>
                  {group.conversations.map((conv) => {
                const isUnread = (conv.unreadCount || 0) > 0;
                return (
                <div 
                  key={conv._id} 
                  onClick={() => handleSelectConversation(conv)}
                  className={`px-3 py-2.5 flex gap-2.5 items-start cursor-pointer transition-all duration-300 group relative ${
                    selected?._id === conv._id
                      ? 'bg-[#E6F4EC] border border-[#1E7F43]/30 rounded-lg shadow-[0_2px_12px_rgba(30,127,67,0.10)] mx-1 my-0.5'
                      : 'bg-white border border-[#E0EDE6] rounded-lg mx-1 my-0.5 hover:border-[#1E7F43]/30 hover:shadow-sm hover:translate-x-[2px]'
                  }`}
                >
                  {/* Read/Unread Dot */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span
                      className={`w-[10px] h-[10px] rounded-full shrink-0 transition-all duration-300 ${
                        isUnread
                          ? 'bg-[#1E7F43] shadow-[0_0_8px_rgba(30,127,67,0.6),0_0_3px_rgba(30,127,67,0.8)]'
                          : 'bg-emerald-300'
                      }`}
                      title={isUnread ? 'Unread' : 'Read'}
                    />
                  </div>
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4.5 w-4.5 rounded-lg border-slate-300 text-[#1E7F43] focus:ring-offset-0 focus:ring-[#1E7F43] transition-all transform group-hover:scale-110"
                      checked={!!bulkSelected[conv._id]}
                      onChange={(e) => toggleBulk(conv._id, e.target.checked)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Name + Source icon + Date */}
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="min-w-0 flex-1">
                        {conv.name && conv.hasLead ? (
                          <div className="font-[800] text-slate-900 truncate tracking-tight text-[14px]">
                            {conv.name}
                          </div>
                        ) : (
                          <div className="font-[700] text-slate-700 truncate tracking-tight text-[14px] flex items-center gap-1.5">
                            <span>{conv.phoneNumber}</span>
                            {!conv.hasLead && (
                              <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded border border-amber-200">NEW</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Channel Icon — based on messaging platform, not lead source */}
                        <span className="text-[13px] text-green-600" title="WhatsApp">
                          <i className="ph-fill ph-whatsapp-logo"></i>
                        </span>
                        {/* Date */}
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : ''}
                        </span>
                        {conv.isBlocked && (
                          <span className="text-[10px] text-red-600" title={`Blocked: ${conv.blockedReason || 'manual'}`}>
                            <i className="ph-fill ph-prohibit"></i>
                          </span>
                        )}
                        {/* Archive / Block - show on hover */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleArchive(conv.phoneNumber); }}
                          className={`p-0.5 rounded transition-all ${
                            showArchived 
                              ? 'text-amber-600 hover:bg-amber-100'
                              : 'text-slate-300 hover:text-amber-600 opacity-0 group-hover:opacity-100'
                          }`}
                          title={showArchived ? 'Unarchive' : 'Archive'}
                        >
                          <i className={`ph ${showArchived ? 'ph-arrow-counter-clockwise' : 'ph-archive'} text-[11px]`}></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleBlockSingle(conv.leadId, !conv.isBlocked, 'manual'); }}
                          className={`p-0.5 rounded transition-all ${
                            conv.isBlocked
                              ? 'text-green-600 hover:bg-green-100'
                              : 'text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100'
                          }`}
                          title={conv.isBlocked ? 'Unblock' : 'Block'}
                        >
                          <i className={`ph ${conv.isBlocked ? 'ph-lock-key-open' : 'ph-prohibit'} text-[11px]`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Phone number (if name exists) */}
                    {conv.name && conv.hasLead && (
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-0.5">
                        <i className="ph ph-phone text-[10px]"></i>
                        <span>{conv.phoneNumber}</span>
                      </div>
                    )}

                    {/* Row 3: Compact info strip — ID, Status, Stage, Assigned */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Lead ID (red) */}
                      <span className="text-[9px] font-[900] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200" title="Lead ID">
                        {conv.leadNumber ? String(conv.leadNumber).padStart(6, '0') : 'N/A'}
                      </span>

                      <span className="text-slate-300 text-[8px]">·</span>

                      {/* Chat Status (interactive) */}
                      <ChatStatusBadge
                        lastMessageAt={conv.lastMessageAt}
                        manualStatus={conv.chatStatus}
                        lastInboundAt={conv.lastInboundAt}
                        lastDirection={conv.lastDirection}
                        size="xs"
                        interactive={true}
                        onStatusChange={(newStatus) => handleChatStatusChange(newStatus, conv.leadId)}
                      />

                      <span className="text-slate-300 text-[8px]">·</span>

                      {/* Lead Stage */}
                      {(() => {
                        // Map legacy status values to new funnel names
                        const statusMap: Record<string, string> = {
                          'lead': 'new_lead', 'hot': 'interested', 'prospect': 'contacted', 'customer': 'enrolled',
                        };
                        const raw = (conv.status || 'new_lead').toLowerCase();
                        const mapped = statusMap[raw] || raw;
                        const colorMap: Record<string, string> = {
                          'new_lead': 'text-blue-700 bg-blue-50 border border-blue-100',
                          'contacted': 'text-sky-700 bg-sky-50 border border-sky-100',
                          'interested': 'text-cyan-700 bg-cyan-50 border border-cyan-100',
                          'demo_trial': 'text-purple-700 bg-purple-50 border border-purple-100',
                          'negotiation': 'text-amber-700 bg-amber-50 border border-amber-100',
                          'enrolled': 'text-emerald-700 bg-emerald-50 border border-emerald-100',
                          'completed': 'text-rose-700 bg-rose-50 border border-rose-100',
                          'inactive': 'text-slate-500 bg-slate-100 border border-slate-200',
                          'repeater': 'text-orange-700 bg-orange-50 border border-orange-100',
                          'old_sadhak': 'text-teal-700 bg-teal-50 border border-teal-100',
                          'only_for_post': 'text-indigo-700 bg-indigo-50 border border-indigo-100',
                        };
                        const labelMap: Record<string, string> = {
                          'new_lead': 'New Lead', 'contacted': 'Contacted', 'interested': 'Interested',
                          'demo_trial': 'Demo/Trial', 'negotiation': 'Negotiation', 'enrolled': 'Enrolled',
                          'completed': 'Completed', 'inactive': 'Inactive', 'repeater': 'Repeater',
                          'old_sadhak': 'Old Sadhak', 'only_for_post': 'Only for Post',
                        };
                        return (
                          <span className={`text-[9px] font-[800] px-1.5 py-0.5 rounded uppercase ${colorMap[mapped] || 'text-blue-700 bg-blue-50 border border-blue-100'}`}>
                            {labelMap[mapped] || mapped.replace(/_/g, ' ')}
                          </span>
                        );
                      })()}

                      <span className="text-slate-300 text-[8px]">·</span>

                      {/* Assigned To (single name) */}
                      <span className="text-[9px] font-[700] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 truncate max-w-[70px]" title={conv.assignedToUserId ? (adminUsers.find(u => u.userId === conv.assignedToUserId)?.name || 'Assigned') : 'Unassigned'}>
                        {conv.assignedToUserId ? (adminUsers.find(u => u.userId === conv.assignedToUserId)?.name?.split(' ')[0] || '—') : '—'}
                      </span>

                      {conv.unreadCount ? (
                        <span className="ml-auto bg-gradient-to-r from-[#1E7F43] to-[#25A55A] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          {conv.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
                </div>
              ))
            )}
          </div>
        </aside>

    {/* CHAT AREA */}
    <main className="flex-1 flex flex-col overflow-hidden relative z-10" style={{ background: 'linear-gradient(180deg, #FAFCFB 0%, #F5F8F6 100%)', boxShadow: '0 8px 32px rgba(30,127,67,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>

          {selected ? (
            <>
              <div className="px-3 py-1.5 flex gap-2 items-center sticky top-0 z-30 shrink-0 backdrop-blur-md" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(230,244,236,0.4) 100%)', borderBottom: '1px solid rgba(30,127,67,0.1)', boxShadow: '0 2px 12px rgba(30,127,67,0.06)' }}>
                <div className="flex items-center gap-2 mr-2">
                   <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #1E7F43, #28964F)' }}>
                      <i className="ph ph-user text-sm"></i>
                   </div>
                   <div>
                     <div className="text-[13px] font-bold text-slate-900 leading-none">{selected.name || "Unknown User"}</div>
                     <div className="text-[10px] font-semibold text-slate-400 mt-0.5 tracking-wide">{selected.phoneNumber}</div>
                   </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className={`p-1.5 rounded-md transition-colors ${
                      assignOpen
                        ? 'text-[#1E7F43] bg-[#E6F4EC]'
                        : 'text-slate-500 hover:text-[#1E7F43] hover:bg-[#E6F4EC]'
                    }`}
                    title="Assign User"
                    onClick={() => {
                      setAssignOpen((v) => !v);
                      setLabelOpen(false);
                    }}
                  >
                    <i className="ph ph-user-plus text-sm"></i>
                  </button>

                  {assignOpen ? (
                    <div className="absolute top-full mt-1 left-0 w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400 px-2 py-0.5">
                        Assign to
                      </div>
                      <div className="space-y-0.5">
                        {assignOptions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full px-2 py-1.5 text-xs text-left rounded-md hover:bg-[#E6F4EC] hover:text-[#1E7F43] text-slate-700 transition-colors"
                            onClick={() => {
                              setSidebarData((prev) => ({ ...prev }));
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
                          className="w-full px-2 py-1.5 text-xs text-left rounded-md hover:bg-slate-50 text-slate-700 transition-colors"
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
                    className={`p-1.5 rounded-md transition-colors ${
                      labelOpen
                        ? 'text-[#1E7F43] bg-[#E6F4EC]'
                        : 'text-slate-500 hover:text-[#1E7F43] hover:bg-[#E6F4EC]'
                    }`}
                    title="Label"
                    onClick={() => {
                      setLabelOpen((v) => !v);
                      setAssignOpen(false);
                    }}
                  >
                    <i className="ph ph-tag text-sm"></i>
                  </button>

                  {labelOpen ? (
                    <div className="absolute top-full mt-1 left-0 w-[240px] bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400 px-2 py-0.5">
                        Labels
                      </div>
                      <div className="flex flex-wrap gap-1 px-1 py-0.5">
                        {(sidebarData.labels || []).map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EC] text-[#1E7F43] border border-[#1E7F43]/20 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-colors"
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
                      <div className="mt-0.5 space-y-0.5">
                        {labelOptions.map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="w-full px-2 py-1.5 text-xs text-left rounded-md hover:bg-[#E6F4EC] hover:text-[#1E7F43] text-slate-700 transition-colors"
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
                          className="w-full px-2 py-1.5 text-xs text-left rounded-md hover:bg-slate-50 text-slate-700 transition-colors"
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
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors" 
                  title="Read or Unread"
                  onClick={() => markThreadAsRead(selected.leadId, selected.phoneNumber)}
                >
                  <i className="ph ph-check text-sm"></i>
                </button>
                
                <button
                  className={`p-1.5 rounded-md transition-colors ${showSidebar ? 'bg-[#E6F4EC] text-[#1E7F43]' : 'text-slate-500 hover:bg-slate-50'}`}
                  title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <i className={`ph ${showSidebar ? 'ph-sidebar-simple' : 'ph-sidebar'} text-sm`}></i>
                </button>
              </div>

              {/* Sticky top bar: Chat Stage + 24H Window Timer */}
              <div className="flex items-center justify-between px-4 py-1.5 shrink-0 z-20" style={{ background: 'linear-gradient(90deg, #E6F4EC 0%, #F0F7F2 50%, #FEF2F2 100%)', borderBottom: '1px solid rgba(30,127,67,0.08)' }}>
                <div className="flex items-center gap-2">
                  <ChatStatusBadge
                    lastMessageAt={selected.lastMessageAt}
                    manualStatus={selected.chatStatus}
                    lastInboundAt={selected.lastInboundAt}
                    lastDirection={selected.lastDirection}
                    size="sm"
                    interactive={true}
                    onStatusChange={handleChatStatusChange}
                  />
                  {calculateChatStatus(selected.lastMessageAt, selected.chatStatus, selected.lastInboundAt, selected.lastDirection) !== 'closed' ? (
                    <button
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      title="Mark as Closed"
                      onClick={() => handleChatStatusChange('closed')}
                    >
                      <i className="ph ph-check-circle text-xs"></i>
                    </button>
                  ) : (
                    <button
                      className="p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                      title="Reopen Chat"
                      onClick={() => handleChatStatusChange('new')}
                    >
                      <i className="ph ph-arrow-counter-clockwise text-xs"></i>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 1px 4px rgba(239,68,68,0.1)' }}>
                    {windowRemaining
                      ? `24H WINDOW • ${String(windowRemaining.hh).padStart(2, '0')}:${String(windowRemaining.mm).padStart(2, '0')}:${String(windowRemaining.ss).padStart(2, '0')}`
                      : '24H WINDOW'}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3" style={{ backgroundColor: '#EEF1F0', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(30,127,67,0.08), rgba(30,127,67,0.15))' }}>
                      <i className="ph ph-chat-circle-dots text-3xl text-[#1E7F43]/50"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400">Send a hello to start the conversation.</p>
                  </div>
                ) : (
                  <>
                    {messages.length > messageLimit && (
                      <div className="flex justify-center pb-4">
                        <button 
                           onClick={() => setMessageLimit(prev => prev + 20)}
                           className="px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-[#1E7F43] hover:text-white transition-all duration-300 hover:scale-105"
                           style={{ background: 'linear-gradient(135deg, rgba(230,244,236,0.8), rgba(255,255,255,0.9))', border: '1px solid rgba(30,127,67,0.15)', boxShadow: '0 2px 8px rgba(30,127,67,0.08)' }}
                           onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #1E7F43, #28964F)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,127,67,0.3)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(230,244,236,0.8), rgba(255,255,255,0.9))'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,127,67,0.08)'; }}
                        >
                           View Earlier Conversations
                        </button>
                      </div>
                    )}
                    {messages.slice(-messageLimit).map((msg) => (
                      <div 
                        key={msg._id} 
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[330px] sm:max-w-[360px] rounded-lg text-[14px] relative group transition-all duration-200 overflow-hidden ${
                          msg.direction === 'outbound'
                            ? 'text-gray-900 rounded-tr-sm shadow-sm'
                            : 'text-white rounded-tl-sm shadow-sm'
                        }`} style={msg.direction === 'outbound' ? { background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)', border: '1px solid rgba(30,127,67,0.12)' } : { background: 'linear-gradient(135deg, #075E54 0%, #0a7e6f 100%)' }}>
                          {/* Media Rendering - Using unified InlineMediaPreview component */}
                          {(() => {
                            // Check for media in various places including template header media
                            const templateHeaderMedia = (msg as any).metadata?.template?.headerMedia?.url || 
                                                        (msg as any).metadata?.template?.headerContent;
                            const rawMediaUrl = msg.media?.url || 
                                                (msg as any).metadata?.mediaUrl || 
                                                (msg as any).mediaUrl ||
                                                templateHeaderMedia;
                            const templateMediaKind = (msg as any).metadata?.template?.headerMedia?.kind || 
                                                      ((msg as any).metadata?.template?.headerFormat === 'IMAGE' ? 'image' : 
                                                       (msg as any).metadata?.template?.headerFormat === 'VIDEO' ? 'video' : null);
                            const mediaKind = msg.media?.kind || (msg as any).metadata?.mediaKind || templateMediaKind || 'image';
                            
                            // Proxy S3 URLs through our API to handle bucket access restrictions
                            const mediaUrl = rawMediaUrl ? getProxiedMediaUrl(rawMediaUrl, token) : null;
                            
                            if (mediaUrl) {
                              // Determine filename for download
                              const dlName = msg.media?.fileName || getFilenameFromUrl(rawMediaUrl) || `media-${Date.now()}`;
                              return (
                                <div className="w-full relative group/media cursor-pointer" onClick={() => { if (mediaKind === 'image' || mediaKind === 'sticker') setLightboxImage(mediaUrl); }}>
                                  <InlineMediaPreview 
                                    url={mediaUrl} 
                                    type={mediaKind === 'sticker' ? 'image' : mediaKind}
                                    className="w-full max-h-[200px] object-cover"
                                  />
                                  {/* Download + Forward overlay buttons */}
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity duration-200">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMediaDownload(mediaUrl, dlName); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-lg backdrop-blur-sm"
                                      title="Download"
                                    >
                                      <i className="ph ph-download-simple text-sm"></i>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setForwardMedia({ url: rawMediaUrl, kind: mediaKind, caption: msg.messageContent || undefined }); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-lg backdrop-blur-sm"
                                      title="Forward"
                                    >
                                      <i className="ph ph-share-fat text-sm"></i>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Show placeholder if message claims to have media but URL is missing
                            if (msg.messageType === 'media' || msg.media?.kind) {
                              return (
                                <div className={`mx-3 mt-2 mb-2 flex items-center gap-2 p-2.5 rounded-lg ${msg.direction === 'outbound' ? 'bg-gray-100 border border-gray-200' : 'bg-white/20'}`}>
                                  <span className="text-lg">📎</span>
                                  <span className={`text-sm ${msg.direction === 'outbound' ? 'text-gray-600' : 'text-white/80'}`}>Media attachment (file unavailable)</span>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}

                          {/* Message Content wrapper with padding */}
                          <div className="px-3 py-2">
                          {/* Message Content - Extract [admincrm] tag to show below */}
                          {(() => {
                            const content = msg.messageContent || '';
                            // Skip media placeholders - match exact and prefix patterns
                            if (!content || 
                                content === '(media)' || 
                                content === '[media]' ||
                                content === '[image]' ||
                                content === '[video]' ||
                                content === '[document]' ||
                                content === '[audio]' ||
                                content === '[sticker]' ||
                                content === '[image message]' ||
                                content === '[video message]' ||
                                content === '[document message]' ||
                                /^\[(image|video|document|audio|sticker|media)\]$/i.test(content.trim()) ||
                                content.startsWith('🖼')) {
                              return null;
                            }
                            // Extract [admincrm] or similar tags
                            const tagMatch = content.match(/\s*\[(admincrm|admin|crm)\]\s*$/i);
                            const mainBody = tagMatch ? content.replace(tagMatch[0], '').trim() : content;
                            const tag = tagMatch ? tagMatch[1] : null;
                            
                            // Format WhatsApp-style text: *bold*, _italic_, ~strikethrough~, and linkify URLs
                            const formatWhatsAppText = (text: string) => {
                              // Helper: linkify URLs in a plain text string
                              const linkifyText = (str: string, lineIdx: number, startKey: number) => {
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const nodes: React.ReactNode[] = [];
                                let lastIdx = 0;
                                let urlMatch;
                                let k = startKey;
                                while ((urlMatch = urlRegex.exec(str)) !== null) {
                                  if (urlMatch.index > lastIdx) {
                                    nodes.push(str.slice(lastIdx, urlMatch.index));
                                  }
                                  const url = urlMatch[1];
                                  nodes.push(
                                    <a key={`link-${lineIdx}-${k++}`} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{url}</a>
                                  );
                                  lastIdx = urlRegex.lastIndex;
                                }
                                if (lastIdx < str.length) {
                                  nodes.push(str.slice(lastIdx));
                                }
                                return { nodes, nextKey: k };
                              };

                              // Split by newlines to preserve line breaks
                              return text.split('\n').map((line, lineIdx) => {
                                // Process each line for formatting
                                const parts: React.ReactNode[] = [];
                                let keyIdx = 0;
                                
                                // Match *bold*, _italic_, ~strike~ patterns
                                const regex = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)/g;
                                let lastIndex = 0;
                                let match;
                                
                                while ((match = regex.exec(line)) !== null) {
                                  // Add text before match (with linkification)
                                  if (match.index > lastIndex) {
                                    const { nodes, nextKey } = linkifyText(line.slice(lastIndex, match.index), lineIdx, keyIdx);
                                    parts.push(...nodes);
                                    keyIdx = nextKey;
                                  }
                                  
                                  const matched = match[0];
                                  const inner = matched.slice(1, -1);
                                  
                                  if (matched.startsWith('*')) {
                                    parts.push(<strong key={`b-${lineIdx}-${keyIdx++}`} className="font-bold">{inner}</strong>);
                                  } else if (matched.startsWith('_')) {
                                    parts.push(<em key={`i-${lineIdx}-${keyIdx++}`} className="italic">{inner}</em>);
                                  } else if (matched.startsWith('~')) {
                                    parts.push(<del key={`s-${lineIdx}-${keyIdx++}`} className="line-through">{inner}</del>);
                                  }
                                  
                                  lastIndex = regex.lastIndex;
                                }
                                
                                // Add remaining text (with linkification)
                                if (lastIndex < line.length) {
                                  const { nodes } = linkifyText(line.slice(lastIndex), lineIdx, keyIdx);
                                  parts.push(...nodes);
                                }
                                
                                return (
                                  <React.Fragment key={lineIdx}>
                                    {parts.length > 0 ? parts : (() => { const { nodes } = linkifyText(line, lineIdx, 0); return nodes.length > 0 ? nodes : [line]; })()}
                                    {lineIdx < text.split('\n').length - 1 && <br />}
                                  </React.Fragment>
                                );
                              });
                            };
                            
                            // Detect video URLs in message text for thumbnail preview
                            const videoUrlRegex = /(https?:\/\/[^\s]+\.(?:mp4|mov|avi|webm|mkv|3gp)(?:[?#][^\s]*)?)/gi;
                            const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
                            const videoUrls = mainBody.match(videoUrlRegex) || [];
                            const ytMatches = [...mainBody.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi)];

                            return (
                              <div className="space-y-1">
                                {/* YouTube video thumbnails */}
                                {ytMatches.map((m, i) => (
                                  <a key={`yt-${i}`} href={m[0].startsWith('http') ? m[0] : `https://${m[0]}`} target="_blank" rel="noopener noreferrer" className="block relative rounded-lg overflow-hidden mb-1">
                                    <img src={`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`} alt="Video" className="w-full max-h-[160px] object-cover rounded-lg" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                                        <i className="ph-fill ph-play text-white text-lg ml-0.5"></i>
                                      </div>
                                    </div>
                                  </a>
                                ))}
                                {/* Direct video file thumbnails */}
                                {videoUrls.map((vUrl, i) => (
                                  <div key={`vid-${i}`} className="relative rounded-lg overflow-hidden mb-1 bg-black">
                                    <video src={vUrl} className="w-full max-h-[160px] object-cover rounded-lg" preload="metadata" muted />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={() => window.open(vUrl, '_blank')}>
                                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                        <i className="ph-fill ph-play text-slate-800 text-lg ml-0.5"></i>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {mainBody && <div className="leading-relaxed">{formatWhatsAppText(mainBody)}</div>}
                              </div>
                            );
                          })()}
                          
                          <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${msg.direction === 'outbound' ? 'justify-end text-gray-500' : 'justify-start text-white/70'}`}>
                            {/* Show "Swar Yoga" in bold black for outbound messages with admin tag */}
                            {msg.direction === 'outbound' && (msg.messageContent || '').match(/\[(admincrm|admin|crm)\]\s*$/i) && (
                              <>
                                <span className="font-bold text-gray-900 text-[11px]">Swar Yoga</span>
                                <span className="mx-1">•</span>
                              </>
                            )}
                            <span className="tracking-wide">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.direction === 'outbound' && (
                              <div className="flex items-center">
                                <i className={`ph ph-checks text-xs ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}></i>
                              </div>
                            )}
                          </div>
                          </div>
                          
                          {/* Template Buttons Rendering - outside content padding */}
                          {(() => {
                            const templateButtons = (msg as any).metadata?.template?.buttons;
                            if (!Array.isArray(templateButtons) || templateButtons.length === 0) return null;
                            
                            return (
                              <div className="border-t border-gray-200/50">
                                {templateButtons.map((btn: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="px-3 py-2 text-center text-[#0078FF] font-medium text-[13px] border-b border-gray-200/50 last:border-b-0 hover:bg-gray-50/50"
                                  >
                                    {btn.title || btn.text || 'Button'}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="px-3 pt-2 pb-6 shrink-0 z-30 backdrop-blur-md" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.98) 0%, rgba(240,247,242,0.9) 100%)', borderTop: '1px solid rgba(30,127,67,0.1)', boxShadow: '0 -4px 16px rgba(30,127,67,0.04)' }}>
                <div className="flex items-end gap-2 max-w-6xl mx-auto">
                  
                  {/* Quick Actions (Plus Button) */}
                  <div className="relative group self-end">
                    <button
                      type="button"
                      onClick={() => setQuickActionsOpen((v) => !v)}
                      className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${
                        quickActionsOpen
                          ? 'text-white shadow-lg'
                          : 'text-slate-400 hover:text-white hover:shadow-lg'
                      }`}
                      style={{ background: quickActionsOpen ? 'linear-gradient(135deg, #1E7F43, #28964F)' : undefined }}
                      onMouseEnter={(e) => { if (!quickActionsOpen) e.currentTarget.style.background = 'linear-gradient(135deg, #1E7F43, #28964F)'; }}
                      onMouseLeave={(e) => { if (!quickActionsOpen) e.currentTarget.style.background = ''; }}
                      title="Quick actions"
                    >
                      <i className="ph-bold ph-lightning text-[16px]"></i>
                    </button>

                    {quickActionsOpen ? (
                      <div className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl flex-col p-2 min-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,242,0.95) 100%)', border: '1px solid rgba(30,127,67,0.15)', boxShadow: '0 8px 32px rgba(30,127,67,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>
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
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-[#E6F4EC] hover:text-[#1E7F43] rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-calendar-plus text-lg"></i>
                            Schedule message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('template')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-note text-lg"></i>
                            Template
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('delay')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-timer text-lg"></i>
                            Delay message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('repeat')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-repeat text-lg"></i>
                            Repeat mode
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('chatbot_flow')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-robot text-lg"></i>
                            Chatbot flow
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Main Input Box with Top Toolbar */}
                  {selected?.isBlocked ? (
                    <div className="flex-1 border border-red-200 rounded-md bg-red-50/50 px-4 py-3 flex items-center gap-3">
                      <i className="ph ph-prohibit text-xl text-red-400"></i>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-600">Blocked {selected.blockedReason === 'stop_keyword' ? '— user sent "stop"' : ''}</p>
                      </div>
                      <button
                        onClick={() => selected.leadId && handleBlockSingle(selected.leadId, false)}
                        className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <i className="ph ph-lock-key-open mr-1"></i> Unblock
                      </button>
                    </div>
                  ) : (
                  <div className="flex-1 rounded-lg bg-white/80 backdrop-blur-sm focus-within:ring-2 focus-within:ring-[#1E7F43]/20 focus-within:border-[#1E7F43] transition-all relative z-20" style={{ border: '1px solid rgba(30,127,67,0.15)', boxShadow: '0 2px 8px rgba(30,127,67,0.06)' }}>
                      
                      {/* Top Toolbar */}
                      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[#E0EDE6]/60 rounded-t-lg relative" style={{ background: 'linear-gradient(90deg, rgba(230,244,236,0.5) 0%, rgba(250,252,251,0.8) 100%)' }}>
                          <button onClick={() => handleToolAction('bold')} title="Bold" className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"><i className="ph ph-text-bolder text-sm"></i></button>
                          <button onClick={() => handleToolAction('italic')} title="Italic" className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"><i className="ph ph-text-italic text-sm"></i></button>
                          <button onClick={() => handleToolAction('emoji')} title="Emoji" className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${showEmojiPicker ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}><i className="ph ph-smiley text-sm"></i></button>
                          <button onClick={() => handleToolAction('symbols')} title="Symbols" className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-[#1E7F43] hover:bg-[#E6F4EC] rounded transition-colors"><i className="ph ph-hash text-sm"></i></button>

                           <div className="w-px h-3.5 bg-slate-200 mx-1"></div>

                           {/* AI Tools */}
                           <button
                             onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)}
                             className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${autoCorrectEnabled ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
                             title={autoCorrectEnabled ? 'Auto-correct ON' : 'Auto-correct OFF'}
                           >
                             <i className={`ph-fill ${autoCorrectEnabled ? 'ph-check-circle' : 'ph-circle'} text-xs`}></i>
                             <span className="hidden xl:inline">Auto</span>
                           </button>
                           <button
                             onClick={handleAIFix}
                             disabled={isFixing || !composerText}
                             className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${isFixing ? 'bg-violet-100 text-violet-700' : 'text-violet-600 hover:bg-violet-50'}`}
                             title="Fix Spelling"
                           >
                             {isFixing ? <LoadingSpinner size="sm"/> : <i className="ph-fill ph-magic-wand text-xs"></i>}
                             <span className="hidden xl:inline">Fix</span>
                           </button>
                           <button
                             onClick={handleAIReply}
                             disabled={isReplying}
                             className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${isReplying ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-fuchsia-600 hover:bg-fuchsia-50'}`}
                             title="AI Suggest Reply"
                           >
                             {isReplying ? <LoadingSpinner size="sm"/> : <i className="ph-fill ph-sparkle text-xs"></i>}
                             <span className="hidden xl:inline">AI</span>
                           </button>

                           <LanguageSelector 
                              currentText={composerText} 
                              onTextTranslated={(t) => setComposerText(t)}
                              onTranslate={handleTranslationCall}
                           />
                          
                          <div className="w-px h-3.5 bg-slate-200 mx-1"></div>

                          {/* Attachment */}
                          <div className="relative">
                            <button 
                                onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)} 
                                title="Attach" 
                                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${attachmentMenuOpen ? 'text-[#1E7F43] bg-[#E6F4EC]' : 'text-slate-400 hover:text-[#1E7F43] hover:bg-[#E6F4EC]'}`}
                            >
                                <i className="ph ph-paperclip text-sm"></i>
                            </button>
                            {attachmentMenuOpen && (
                                <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-md shadow-lg flex flex-col p-1.5 min-w-[150px] z-50">
                                    <div className="text-[9px] font-bold uppercase text-slate-400 px-2 py-1 tracking-wider">Attach</div>
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 rounded text-left" onClick={() => { handleToolAction('image'); setAttachmentMenuOpen(false); }}>
                                        <i className="ph-fill ph-image text-emerald-600"></i> Image
                                    </button>
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 rounded text-left" onClick={() => { handleToolAction('video'); setAttachmentMenuOpen(false); }}>
                                        <i className="ph-fill ph-video-camera text-rose-600"></i> Video
                                    </button>
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 rounded text-left" onClick={() => { handleToolAction('document'); setAttachmentMenuOpen(false); }}>
                                        <i className="ph-fill ph-file-text text-blue-600"></i> Document
                                    </button>
                                </div>
                            )}
                          </div>

                          {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 shadow-lg rounded-md border border-slate-200">
                              <EmojiPicker 
                                theme={Theme.LIGHT} 
                                onEmojiClick={(e) => {
                                  appendToComposer(e.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                width={280}
                                height={320}
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

                      {/* Upload Progress Bar */}
                      {uploadProgress !== null && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#E6F4EC] border-b border-[#1E7F43]/20">
                          <span className="text-[10px] font-bold text-[#1E7F43]">Uploading</span>
                          <div className="flex-1 bg-[#1E7F43]/20 rounded-full h-1.5">
                            <div className="bg-[#1E7F43] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-[#1E7F43]">{uploadProgress}%</span>
                        </div>
                      )}

                      {/* Media Preview - Using unified MediaPreview component */}
                      {attachedMedia && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F4EC] border-b border-[#1E7F43]/20">
                          <MediaPreview 
                            media={{ 
                              url: attachedMedia.url, 
                              type: attachedMedia.type,
                              name: getFilenameFromUrl(attachedMedia.url)
                            }}
                            size="sm"
                            showDownload={false}
                            showExpand
                          />
                          <span className="text-[10px] font-bold text-slate-600 truncate flex-1">
                            {getFilenameFromUrl(attachedMedia.url)}
                          </span>
                          <button
                            onClick={() => setAttachedMedia(null)}
                            className="h-5 w-5 rounded flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                            title="Remove"
                          >
                            <i className="ph-bold ph-x text-xs"></i>
                          </button>
                        </div>
                      )}

                      <SpellCheckTextarea
                        value={composerText}
                        onChange={handleComposerChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={autoCorrectEnabled ? "Type message... (Auto ON)" : "Type message..."}
                        className="px-3 py-2 border-none focus:ring-0 max-h-28 min-h-[36px] placeholder:text-slate-400 font-medium text-slate-700 text-[13px]"
                        token={token || ''}
                      />
                  </div>
                  )}

                  <button 
                    onClick={handleSendMessage}
                    disabled={(!composerText.trim() && !attachedMedia) || sending || selected?.isBlocked}
                    className="text-white h-8 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-40 disabled:transform-none flex items-center gap-1.5 self-end hover:shadow-lg hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #1E7F43 0%, #28964F 100%)', boxShadow: '0 2px 8px rgba(30,127,67,0.3)' }}
                  >
                    {sending ? <LoadingSpinner size="sm" /> : <i className="ph-bold ph-paper-plane-right text-sm"></i>}
                    <span className="hidden xl:inline">Send</span>
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
                                  : actionModal.type === 'chatbot_flow'
                                    ? 'Chatbot flow'
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
                        <div className="text-sm font-bold text-slate-700 mb-2">Delay message</div>
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-600">
                            <span className="block mb-1">Message</span>
                            <textarea
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                              rows={3}
                              placeholder="Type your message..."
                              value={scheduleMessage || composerText}
                              onChange={(e) => setScheduleMessage(e.target.value)}
                            />
                          </label>
                          <div className="text-xs font-semibold text-slate-600 mb-1">Delay duration</div>
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
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm"
                            onClick={closeActionModal}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm disabled:opacity-50"
                            onClick={() => createScheduledMessage('delay')}
                            disabled={scheduleBusy || !selected}
                          >
                            {scheduleBusy ? 'Scheduling...' : 'Send with delay'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {actionModal.type === 'repeat' ? (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 mb-2">Repeat mode</div>
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-600">
                            <span className="block mb-1">Message</span>
                            <textarea
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                              rows={3}
                              placeholder="Type your message..."
                              value={scheduleMessage || composerText}
                              onChange={(e) => setScheduleMessage(e.target.value)}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs font-semibold text-slate-600">
                              <span className="block mb-1">Frequency</span>
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
                              <span className="block mb-1">First send at</span>
                              <input
                                type="datetime-local"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                value={scheduleAt}
                                onChange={(e) => setScheduleAt(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                              />
                            </label>
                          </div>
                          {repeatConfig.mode === 'custom' && (
                            <label className="text-xs font-semibold text-slate-600">
                              <span className="block mb-1">Custom rule (e.g., every 2 days at 10:00)</span>
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
                              />
                            </label>
                          )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm"
                            onClick={closeActionModal}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm disabled:opacity-50"
                            onClick={() => createScheduledMessage('repeat')}
                            disabled={scheduleBusy || !selected}
                          >
                            {scheduleBusy ? 'Scheduling...' : 'Set repeat'}
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
                          <textarea 
                            rows={3}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Type new quick reply (multi-line supported)..."
                            value={newQuickReply}
                            onChange={(e) => setNewQuickReply(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                e.preventDefault();
                                if (newQuickReply.trim()) {
                                  setQuickReplies(prev => [{ id: Date.now().toString(), text: newQuickReply }, ...prev]);
                                  setNewQuickReply('');
                                }
                              }
                            }}
                          />
                          <button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-bold"
                            onClick={() => {
                              if (newQuickReply.trim()) {
                                setQuickReplies(prev => [{ id: Date.now().toString(), text: newQuickReply }, ...prev]);
                                setNewQuickReply('');
                              }
                            }}
                          >
                            Add
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 mb-3">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] border border-slate-200">Ctrl+Enter</kbd> to add</p>

                        {/* List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {quickReplies.map(qr => (
                            <div key={qr.id} className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-[#1E7F43]/30 hover:bg-[#E6F4EC]/50 transition-all">
                              <p 
                                className="text-sm text-slate-700 font-medium cursor-pointer flex-1 whitespace-pre-wrap line-clamp-4"
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

                    {actionModal.type === 'chatbot_flow' ? (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 mb-1">Start a chatbot flow for this conversation</div>
                        <p className="text-[11px] text-slate-400 mb-3">First message sends immediately. Next messages follow on user reply.</p>
                        {chatbotFlowsLoading ? (
                          <div className="flex items-center justify-center py-8 text-slate-400">
                            <i className="ph ph-spinner animate-spin text-2xl mr-2"></i>
                            Loading flows...
                          </div>
                        ) : chatbotFlows.length === 0 ? (
                          <div className="text-center py-8">
                            <i className="ph ph-robot text-4xl text-slate-300 mb-2"></i>
                            <p className="text-sm text-slate-500">No chatbot flows found.</p>
                            <a href="/admin/crm/chatbots" className="text-xs text-cyan-600 hover:underline mt-1 inline-block">Create one in Chatbot Builder →</a>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[350px] overflow-y-auto">
                            {chatbotFlows.map(flow => (
                              <div key={flow._id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-cyan-50/40 transition-colors group">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${flow.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                    <span className="text-sm font-semibold text-slate-800 truncate">{flow.name}</span>
                                  </div>
                                  {flow.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate pl-4">{flow.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1 pl-4">
                                    <span className="text-[10px] text-slate-400">{flow.nodes?.length || 0} nodes</span>
                                    <span className={`text-[10px] font-semibold ${flow.enabled ? 'text-green-600' : 'text-slate-400'}`}>{flow.enabled ? 'Active' : 'Disabled'}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={!!chatbotFlowAssigning}
                                  onClick={() => assignChatbotFlow(flow._id)}
                                  className="px-3 py-1.5 text-xs font-bold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {chatbotFlowAssigning === flow._id ? 'Sending...' : '▶ Start'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={removeChatbotFlow}
                            disabled={!!chatbotFlowAssigning}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                          >
                            {chatbotFlowAssigning === '__remove__' ? 'Removing...' : '🗑 Remove current flow'}
                          </button>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm"
                            onClick={closeActionModal}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {actionModal.type === 'schedule' || actionModal.type === 'template' ? (
                      <div className="mt-4">
                        {actionModal.type === 'template' ? (
                          <TemplateSelector
                            token={token}
                            onSelect={async (template: WhatsAppTemplate) => {
                              // Send template via API with image and buttons
                              if (!selected?.phoneNumber) {
                                alert('No phone number selected');
                                return;
                              }
                              
                              try {
                                setSending(true);
                                console.log('[Meta Inbox] Sending template:', template.templateName, 'to:', selected.phoneNumber);
                                const res = await fetch('/api/admin/crm/whatsapp/send-template', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    phoneNumber: selected.phoneNumber,
                                    templateId: template._id, // Use _id as templateId
                                    leadId: selected.leadId || selected._id,
                                  }),
                                });
                                
                                const data = await res.json();
                                console.log('[Meta Inbox] Send template response:', data);
                                if (data.success) {
                                  // Refresh messages to show the sent template
                                  loadMessages(selected.leadId || selected._id || selected.phoneNumber);
                                  closeActionModal();
                                } else {
                                  console.error('[Meta Inbox] Template send failed:', data);
                                  alert(data.error || 'Failed to send template');
                                }
                              } catch (err) {
                                console.error('[Meta Inbox] Error sending template:', err);
                                alert('Failed to send template: ' + (err instanceof Error ? err.message : String(err)));
                              } finally {
                                setSending(false);
                              }
                            }}
                            onClose={closeActionModal}
                            showSearch={true}
                            showFilters={true}
                            showPreview={true}
                            mode="inline"
                            maxHeight="400px"
                            provider="meta"
                          />
                        ) : (
                          <div className="space-y-4">
                            <div className="text-sm font-bold text-slate-700">Schedule message</div>
                            <div className="space-y-3">
                              <label className="text-xs font-semibold text-slate-600">
                                <span className="block mb-1">Message</span>
                                <textarea
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] resize-none"
                                  rows={3}
                                  placeholder="Type your message..."
                                  value={scheduleMessage || composerText}
                                  onChange={(e) => setScheduleMessage(e.target.value)}
                                />
                              </label>
                              <label className="text-xs font-semibold text-slate-600">
                                <span className="block mb-1">Send at</span>
                                <input
                                  type="datetime-local"
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43]"
                                  value={scheduleAt}
                                  onChange={(e) => setScheduleAt(e.target.value)}
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                              </label>
                            </div>
                            <div className="text-right">
                              <button
                                type="button"
                                className="bg-[#1E7F43] hover:bg-[#166235] text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm disabled:opacity-50"
                                onClick={() => createScheduledMessage('schedule')}
                                disabled={scheduleBusy || !selected}
                              >
                                {scheduleBusy ? 'Scheduling...' : 'Schedule'}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-4 text-right">
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm"
                            onClick={closeActionModal}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4" style={{ background: 'linear-gradient(180deg, #FAFCFB 0%, #F0F7F2 100%)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(30,127,67,0.08) 0%, rgba(30,127,67,0.18) 100%)', boxShadow: '0 8px 24px rgba(30,127,67,0.1), inset 0 1px 2px rgba(255,255,255,0.5)' }}>
                <i className="ph ph-whatsapp-logo text-6xl text-[#1E7F43]/40"></i>
              </div>
              <p className="font-bold text-lg text-slate-500">Select a conversation to start chatting</p>
              <p className="text-xs text-slate-400">Your chats will appear here.</p>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {showSidebar && (
          <aside className="w-72 p-4 overflow-y-auto shrink-0 backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,247,242,0.9) 100%)', borderLeft: '1px solid rgba(30,127,67,0.1)' }}>
            {selected ? (
              <>
              <div className="mb-4 p-1 pb-3" style={{ borderBottom: '1px solid rgba(30,127,67,0.1)' }}>
                <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #1E7F43 0%, #28964F 50%, #1E7F43 100%)', boxShadow: '0 4px 12px rgba(30,127,67,0.3), inset 0 1px 1px rgba(255,255,255,0.2)' }}
                  onClick={() => setAvatarZoom(true)}
                  title="Click to zoom"
                >
                  {selected.name ? selected.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 leading-tight">{selected.name || selected.phoneNumber}</h3>
                  <p className="text-xs text-slate-500">{selected.phoneNumber}</p>
                </div>
                </div>
                  {/* Labels in a single row */}
                  {sidebarData.labels && sidebarData.labels.length > 0 && (
                    <div className="flex flex-nowrap items-center gap-1.5 mt-2 overflow-x-auto">
                      {sidebarData.labels.map((label, idx) => {
                        const l = label.toLowerCase();
                        const color = l.includes('whatsapp') ? 'text-green-600'
                          : l.includes('community') ? 'text-purple-600'
                          : l.includes('facebook') || l.includes('meta') ? 'text-blue-600'
                          : l.includes('instagram') ? 'text-pink-600'
                          : l.includes('website') || l.includes('web') ? 'text-cyan-600'
                          : l.includes('referral') ? 'text-amber-600'
                          : l.includes('interested') || l.includes('intrested') ? 'text-rose-600'
                          : l.includes('customer') ? 'text-indigo-600'
                          : l.includes('paid') || l.includes('payment') ? 'text-emerald-600'
                          : ['text-orange-600', 'text-teal-600', 'text-violet-600'][idx % 3];
                        return (
                          <span key={idx} className={`text-[11px] font-bold whitespace-nowrap ${color}`}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
              </div>

              <div className="space-y-6">
                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">CRM Details</label>
                  <div className="space-y-2.5">
                    <div className="flex flex-col gap-1 text-sm py-1.5 border-b border-gray-50">
                      <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Assign To</span>
                      <select 
                        className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] outline-none font-semibold text-[#1E7F43]" style={{ background: 'rgba(249,250,249,0.8)', borderColor: 'rgba(30,127,67,0.15)' }}
                        value={sidebarData.assignedTo}
                        onChange={(e) => setSidebarData({ ...sidebarData, assignedTo: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {adminUsers.map(u => (
                          <option key={u.userId} value={u.userId}>
                            {u.name} {u.email ? `(${u.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 text-sm py-1.5 border-b border-gray-50">
                      <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Status</span>
                      <select 
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none bg-slate-50 font-semibold text-green-700"
                        value={sidebarData.status}
                        onChange={(e) => setSidebarData({ ...sidebarData, status: e.target.value })}
                      >
                        <option value="new_lead">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="demo_trial">Demo / Trial</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="completed">Completed</option>
                        <option value="inactive">Inactive</option>
                        <option value="repeater">Repeater</option>
                        <option value="old_sadhak">Old Sadhak</option>
                        <option value="only_for_post">Only for Post</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">Labels</label>
                  <select 
                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] outline-none bg-slate-50"
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !sidebarData.labels.includes(e.target.value)) {
                        setSidebarData(prev => ({ ...prev, labels: [...prev.labels, e.target.value] }));
                      }
                    }}
                  >
                    <option value="">+ Add label...</option>
                    {labelOptions.filter(opt => !sidebarData.labels.includes(opt)).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </section>

                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Internal Notes</label>
                  <textarea 
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] outline-none min-h-[110px] bg-slate-50 placeholder:text-slate-400"
                    placeholder="Add a remark about this customer..."
                    spellCheck={true}
                    autoComplete="on"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    lang="en"
                    data-gramm="true"
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
                  className="w-full bg-[#1E7F43] text-white flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold hover:bg-[#166235] transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingSidebar ? <LoadingSpinner size="sm" /> : <i className="ph ph-floppy-disk text-lg"></i>}
                  <span>Save Changes</span>
                </button>

                {/* Block / Unblock this lead */}
                <button
                  onClick={() => selected?.leadId && handleBlockSingle(selected.leadId, !selected.isBlocked, 'manual')}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold transition-colors shadow-sm ${
                    selected?.isBlocked
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <i className={`ph ${selected?.isBlocked ? 'ph-lock-key-open' : 'ph-prohibit'} text-lg`}></i>
                  <span>{selected?.isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
                {selected?.isBlocked && selected?.blockedReason && (
                  <div className="text-[10px] text-red-600 font-semibold text-center -mt-2">
                    Blocked reason: {selected.blockedReason === 'stop_keyword' ? 'User sent "stop"' : selected.blockedReason}
                  </div>
                )}
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
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43]"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43]"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43]"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Source</label>
              <select
                name="source"
                value={form.values.source}
                onChange={form.handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43]"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43]"
              >
                <option value="new_lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="demo_trial">Demo / Trial</option>
                <option value="negotiation">Negotiation</option>
                <option value="enrolled">Enrolled</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
                <option value="repeater">Repeater</option>
                <option value="old_sadhak">Old Sadhak</option>
                <option value="only_for_post">Only for Post</option>
              </select>
            </div>
          </div>
        </FormModal>
      )}

      {/* Forward Media Modal */}
      {forwardMedia && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => { setForwardMedia(null); setForwardSearch(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Forward Media</h3>
              <button onClick={() => { setForwardMedia(null); setForwardSearch(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>
            
            {/* Media Preview */}
            <div className="px-5 pt-3 pb-2">
              <div className="w-full max-h-[120px] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                {forwardMedia.kind === 'image' || forwardMedia.kind === 'sticker' ? (
                  <img src={getProxiedMediaUrl(forwardMedia.url, token)} alt="Forward" className="max-h-[120px] object-contain" />
                ) : forwardMedia.kind === 'video' ? (
                  <video src={getProxiedMediaUrl(forwardMedia.url, token)} className="max-h-[120px]" controls />
                ) : (
                  <div className="p-3 flex items-center gap-2">
                    <i className="ph ph-file text-2xl text-slate-400"></i>
                    <span className="text-sm text-slate-600 truncate">{forwardMedia.caption || 'Document'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="px-5 py-2">
              <input
                type="text"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="Search contacts to forward..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] outline-none"
                autoFocus
              />
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {conversations
                .filter(c => {
                  if (!forwardSearch.trim()) return true;
                  const q = forwardSearch.toLowerCase();
                  return (c.name?.toLowerCase().includes(q)) || c.phoneNumber.includes(q);
                })
                .slice(0, 30)
                .map(c => (
                  <button
                    key={c._id}
                    disabled={forwardBusy}
                    onClick={() => handleForwardMedia(c.leadId, c.phoneNumber)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E7F43] to-[#25A55A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {c.name ? c.name[0].toUpperCase() : '#'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{c.phoneNumber}</p>
                    </div>
                    <i className="ph ph-paper-plane-right text-slate-400"></i>
                  </button>
                ))}
              {conversations.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">No contacts found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Zoom Modal */}
      {avatarZoom && selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setAvatarZoom(false)}>
          <div className="relative flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="w-48 h-48 rounded-3xl flex items-center justify-center text-white font-extrabold text-8xl" style={{ background: 'linear-gradient(135deg, #1E7F43 0%, #28964F 50%, #1E7F43 100%)', boxShadow: '0 16px 48px rgba(30,127,67,0.4), inset 0 2px 4px rgba(255,255,255,0.2)' }}>
              {selected.name ? selected.name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-center">
              <h2 className="text-white text-xl font-bold">{selected.name || 'Unknown'}</h2>
              <p className="text-white/70 text-sm">{selected.phoneNumber}</p>
            </div>
            <button 
              onClick={() => setAvatarZoom(false)}
              className="absolute -top-2 -right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
              title="Close"
            >
              <i className="ph ph-x text-xl"></i>
            </button>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-screen flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={lightboxImage} 
              alt="Full-screen" 
              className="max-w-full max-h-screen object-contain rounded-lg"
            />
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
              title="Close"
            >
              <i className="ph ph-x text-xl"></i>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #F0F4F1;
        }
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1E7F43 0%, #28964F 100%);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #166235 0%, #1E7F43 100%);
        }

        .animate-in {
          animation: animate-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Glossy selection highlight */
        ::selection {
          background: rgba(30, 127, 67, 0.2);
          color: inherit;
        }

        /* Smooth focus transitions */
        *:focus-visible {
          outline: 2px solid rgba(30, 127, 67, 0.4);
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
