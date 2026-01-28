'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { InlineMediaPreview, MediaPreview, detectMediaType, getFilenameFromUrl, TemplateSelector, type WhatsAppTemplate } from '@/components/admin/crm';
import { 
  Paperclip, 
  Zap, 
  FileText, 
  Clock, 
  Smile, 
  Send,
  MoreVertical,
  Search,
  UserPlus,
  RefreshCw,
  LogOut,
  Settings,
  X,
  Plus,
  Image as ImageIcon,
  File as FileIcon,
  Mic,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

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

function QRWhatsAppInboxPageContent() {
  const token = useAuth();
  const searchParams = useSearchParams();
  const phoneParam = searchParams?.get('phone');
  const leadIdParam = searchParams?.get('leadId');
  const nameParam = searchParams?.get('name'); // New param
  const [status, setStatus] = useState('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const isSendingRef = useRef(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bridgeUnavailable, setBridgeUnavailable] = useState(false); // Track if bridge is completely down

  const isOffline = status !== 'connected';

  // Reduce status/404 vibration: keep a lightweight backoff for polling on repeated failures
  const statusPollDelayRef = useRef<number>(15000);
  const lastBridgeErrorRef = useRef<string | null>(null);
  const lastStatusRef = useRef<string>('loading');
  const statusRef = useRef<string>('loading');
  const showQRModalRef = useRef<boolean>(false);
  const statusPollTimeoutRef = useRef<number | null>(null);

  // Diagnostics for troubleshooting (admin-only, hidden by default)
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastStatusCode, setLastStatusCode] = useState<number | null>(null);
  const [lastQrCode, setLastQrCode] = useState<number | null>(null);
  const [lastStatusData, setLastStatusData] = useState<any>(null);
  const [lastHealthCode, setLastHealthCode] = useState<number | null>(null);
  const [lastHealthData, setLastHealthData] = useState<any>(null);

  const [loggingInNewNumber, setLoggingInNewNumber] = useState(false);
  const [forceResetting, setForceResetting] = useState(false);
  const [forceResetInstructions, setForceResetInstructions] = useState<string[] | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [isEditingGroupDesc, setIsEditingGroupDesc] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [gettingInviteLink, setGettingInviteLink] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  
  // Sidebar Tab State: 'chats' | 'groups' | 'status'
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'groups' | 'status'>('chats');
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Spell check suggestions popup state
  const [spellSuggestions, setSpellSuggestions] = useState<{ 
    word: string; 
    suggestions: string[]; 
    position: { x: number; y: number } 
  } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };
  
  // Media pending to be sent
  const [pendingMedia, setPendingMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
  // Template media URL (for images from templates)
  const [templateMediaUrl, setTemplateMediaUrl] = useState<string | null>(null);
  
  // Selected template for sending via Meta Cloud API
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  // Inbound media cache (bridge returns base64 via /messages/media/:msgId)
  const [messageMediaCache, setMessageMediaCache] = useState<
    Record<string, { dataUrl: string; mimetype: string; filename?: string }>
  >({});
  const [messageMediaLoading, setMessageMediaLoading] = useState<Record<string, boolean>>({});

  // Media failure backoff to avoid retry/toast spam during polling
  const mediaFailuresRef = useRef<Record<string, { lastFailAt: number; failCount: number }>>({});
  const lastMediaToastAtRef = useRef<number>(0);
  
  // New Lead Modal
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'qr-whatsapp',
    status: 'lead',
    workshopName: '',
    assignedToUserId: '',
  });
  const [creatingLead, setCreatingLead] = useState(false);
  
  // Admin user management
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [assignedLeadIds, setAssignedLeadIds] = useState<Set<string>>(new Set());
  
  // Assign chat dropdown
  const [showAssignDropdown, setShowAssignDropdown] = useState<string | null>(null);
  const [assigningChat, setAssigningChat] = useState(false);
  
  // Track the phone parameter to always display at top
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(nameParam || null); // Initialize with param
  const [activeLeadId, setActiveLeadId] = useState<string | null>(leadIdParam || null);
  const [activeLeadNumber, setActiveLeadNumber] = useState<string | null>(null); // Human-friendly ID
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  
  // Cache lead data by phone number for sidebar display
  const [leadDataCache, setLeadDataCache] = useState<Record<string, any>>({});

  // Right Sidebar State (CRM Details Panel)
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [sidebarData, setSidebarData] = useState({
    status: '',
    labels: [] as string[],
    notes: '',
    followUpDate: '',
    assignedTo: '',
  });
  const [savingSidebar, setSavingSidebar] = useState(false);
  const labelOptions = ['New', 'Chatting/Replying', 'No Reply', 'Call Pending', 'Call Done', 'Interested', 'Enrolled'];

  // Quick Replies & Templates
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; message: string }>>([
    { id: '1', message: 'Thank you for contacting us!' },
    { id: '2', message: 'I will get back to you soon.' },
    { id: '3', message: 'Can you provide more details?' },
  ]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState('');

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; message: string }>>([
    { id: 't1', name: 'Welcome', message: 'Welcome to Swar Yoga! 🙏' },
    { id: 't2', name: 'Follow-up', message: 'Just checking in on your progress.' },
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });

  // Schedule & Delay Settings
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [useSchedule, setUseSchedule] = useState(false);
  const [useDelay, setUseDelay] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [delayDays, setDelayDays] = useState('0');
  const [delayHours, setDelayHours] = useState('0');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [delaySeconds, setDelaySeconds] = useState('0');

  // NOTE: Don't globally abort previous requests.
  // Polling (/status every 3s) + dev HMR can overlap slightly; aborting triggers
  // repeated cancels and keeps the browser stuck on a preflight/pending pattern.

  const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  const bridgeSecret = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

  // Offline cache keys (localStorage)
  const CHAT_CACHE_KEY = 'wa_qr_cached_chats_v1';
  const CHAT_SELECTED_CACHE_KEY = 'wa_qr_cached_selected_chat_id_v1';
  const MESSAGES_CACHE_KEY_PREFIX = 'wa_qr_cached_messages_v1:';
  const cacheKeyForChat = (chat: any) => {
    const id = typeof chat?.id === 'string' ? chat.id : chat?.id?._serialized;
    return id ? `${MESSAGES_CACHE_KEY_PREFIX}${id}` : null;
  };
  const getChatId = (chat: any) => (typeof chat?.id === 'string' ? chat.id : chat?.id?._serialized);
  const safeJsonParse = <T,>(value: string | null): T | null => {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  const bridgeFetch = useCallback(async (path: string, init: RequestInit = {}, timeoutMs = 20_000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Use API proxy to avoid CORS errors
      const method = (init.method || 'GET').toUpperCase();
      
      if (method === 'GET') {
        const url = new URL('/api/admin/crm/whatsapp/bridge-proxy', window.location.origin);
        url.searchParams.set('path', path);
        
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
          cache: 'no-store'
        });
        return res;
      }

      // For POST/PUT, use body
      const res = await fetch('/api/admin/crm/whatsapp/bridge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ path, body: init.body }),
        signal: controller.signal,
        cache: 'no-store'
      });
      return res;
    } catch (error) {
      // Handle AbortError specifically
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.debug(`[bridgeFetch] Request timeout after ${timeoutMs}ms for path: ${path}`);
          throw new Error(`Bridge request timeout (${timeoutMs}ms) - Check if bridge is running`);
        }
        // For CORS or network errors, return a 503 response instead of throwing
        console.debug(`[bridgeFetch] Network error for ${path}:`, error.message);
        return new Response(JSON.stringify({ error: 'Bridge unavailable', details: error.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, [token]);

  // Keep refs in sync so polling logic doesn't depend on reactive state.
  useEffect(() => {
    showQRModalRef.current = showQRModal;
  }, [showQRModal]);

  const parseBridgeError = async (res: Response) => {
    try {
      const data = await res.json();
      return data?.error || data?.message || `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  };

  const loadMediaForMessage = useCallback(
    async (msg: any, opts?: { force?: boolean }) => {
      // For CRM messages: prefer waMessageId (WhatsApp ID) for bridge calls
      // For bridge messages: use id directly (already is WhatsApp ID)
      const bridgeId = msg?.waMessageId || msg?.id;
      const cacheKey = String(msg?.id || msg?.waMessageId || msg?._id || '');
      
      if (!bridgeId || !cacheKey) return;
      if (messageMediaCache[cacheKey]?.dataUrl) return;
      if (messageMediaLoading[cacheKey]) return;
      
      // If message has a direct mediaUrl or media.url (from S3/cloud), use that instead of bridge
      const s3MediaUrl = msg?.mediaUrl || msg?.media?.url;
      const s3MimeType = msg?.mimeType || msg?.media?.mimeType;
      if (s3MediaUrl && !msg?._bridgeMessage) {
        setMessageMediaCache((prev) => ({
          ...prev,
          [cacheKey]: { dataUrl: s3MediaUrl, mimetype: s3MimeType || 'image/jpeg' },
        }));
        return;
      }

      const now = Date.now();
      const fail = mediaFailuresRef.current[cacheKey];
      const cooldownMs = 5 * 60_000; // 5 minutes
      if (!opts?.force && fail?.lastFailAt && now - fail.lastFailAt < cooldownMs) {
        return;
      }

      setMessageMediaLoading((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        // Media can be large/slow: align with proxy timeout (30s)
        const res = await bridgeFetch(`/messages/media/${encodeURIComponent(bridgeId)}`, { method: 'GET' }, 35_000);
        if (!res.ok) {
          const err = await parseBridgeError(res);
          throw new Error(err);
        }
        const data = await res.json();
        const mimetype = String(data?.mimetype || 'application/octet-stream');
        const b64Raw = String(data?.data || '');
        const b64 = b64Raw.replace(/\s+/g, '');
        
        if (!b64) {
          // Instead of throwing a "Media payload missing" error which clutters the console
          // and causes repeated retries, we silently fail and mark it as loaded 
          // with a null URL so we don't try again soon.
          setMessageMediaCache((prev) => ({
            ...prev,
            [cacheKey]: { dataUrl: '', mimetype, isMissing: true },
          }));
          return;
        }
        
        const dataUrl = `data:${mimetype};base64,${b64}`;

        setMessageMediaCache((prev) => ({
          ...prev,
          [cacheKey]: {
            dataUrl,
            mimetype,
            filename: typeof data?.filename === 'string' ? data.filename : undefined,
          },
        }));

        // Clear any failure backoff once it succeeds
        delete mediaFailuresRef.current[cacheKey];
      } catch (e) {
        const prevFail = mediaFailuresRef.current[cacheKey];
        mediaFailuresRef.current[cacheKey] = {
          lastFailAt: Date.now(),
          failCount: (prevFail?.failCount || 0) + 1,
        };
        console.warn('[media] failed to load message media:', bridgeId, e);

        // Rate-limit toasts to avoid "console vibrating" during polling
        const toastCooldownMs = 15_000;
        const lastToastAt = lastMediaToastAtRef.current;
        if (Date.now() - lastToastAt > toastCooldownMs) {
          lastMediaToastAtRef.current = Date.now();
          showToast('Failed to load some media. Click the attachment to retry.', 'error');
        }
      } finally {
        setMessageMediaLoading((prev) => {
          const next = { ...prev };
          delete next[cacheKey];
          return next;
        });
      }
    },
    [bridgeFetch, messageMediaCache, messageMediaLoading]
  );

  const refreshBridgeHealth = useCallback(async () => {
    try {
      // Use the bridge-health endpoint
      const res = await fetch('/api/admin/crm/whatsapp/bridge-health?action=status', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store'
      }).catch(() => null);
      
      if (!res) {
        setLastHealthCode(0);
        return;
      }
      
      setLastHealthCode(res.status);
      if (!res.ok) {
        return;
      }
      
      try {
        const data = await res.json();
        setLastHealthData(data);
      } catch {
        // Response was not JSON - that's OK
        setLastHealthData({ status: 'ok' });
      }
    } catch (e) {
      console.warn('[health] failed:', e);
      setLastHealthCode(0);
    }
  }, [token]);

  const handleBridgeRestart = useCallback(async () => {
    try {
      // **PERMANENT FIX**: Minimal bridge doesn't support /restart endpoint
      // Just show a user-friendly message instead
      setBridgeError('Bridge restart not available on minimal bridge. Click "Connect" to refresh QR code.');
      return;
      setShowQRModal(true);
      showToast('✅ Bridge restart requested', 'success');
      // Give the bridge a moment, then refresh status/health.
      setTimeout(() => {
        refreshQr();
        refreshBridgeHealth();
      }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bridge restart failed';
      setBridgeError(msg);
      showToast(`❌ ${msg}`, 'error');
    }
  }, [bridgeFetch, refreshBridgeHealth]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!showDiagnostics) return;
    refreshBridgeHealth();
  }, [isSuperAdmin, showDiagnostics, refreshBridgeHealth]);

  const normalizeBridgeStatus = (raw: any): 'connected' | 'qr' | 'disconnected' | 'loading' => {
    const s = String(raw || '').toLowerCase();
    if (s === 'connected' || s === 'ready' || s === 'authenticated') return 'connected';
    if (s === 'qr') return 'qr';
    if (s === 'connecting' || s === 'initializing') return 'loading';
    return 'disconnected';
  };

  // Load cached chats/messages on mount (so UI still shows history when bridge is disconnected)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cachedChats = safeJsonParse<any[]>(localStorage.getItem(CHAT_CACHE_KEY));
    if (Array.isArray(cachedChats) && cachedChats.length > 0) {
      setChats((prev) => (prev.length > 0 ? prev : cachedChats));
    }

    // Restore last selected chat if possible
    const cachedSelectedId = localStorage.getItem(CHAT_SELECTED_CACHE_KEY);
    if (cachedSelectedId && Array.isArray(cachedChats) && cachedChats.length > 0) {
      const match = cachedChats.find((c) => getChatId(c) === cachedSelectedId);
      if (match) {
        setSelectedChat((prev: any) => prev || match);

        const msgKey = cacheKeyForChat(match);
        if (msgKey) {
          const cachedMsgs = safeJsonParse<any[]>(localStorage.getItem(msgKey));
          if (Array.isArray(cachedMsgs) && cachedMsgs.length > 0) {
            setMessages((prev) => (prev.length > 0 ? prev : cachedMsgs));
          }
        }
      }
    }
  }, []);

  // Check status - poll less frequently to reduce flickering/vibration
  useEffect(() => {
    let cancelled = false;

    const setBridgeErrorIfChanged = (msg: string | null) => {
      if (lastBridgeErrorRef.current === msg) return;
      lastBridgeErrorRef.current = msg;
      setBridgeError(msg);
    };

    const setStatusIfChanged = (s: string) => {
      if (lastStatusRef.current === s) return;
      lastStatusRef.current = s;
      statusRef.current = s;
      setStatus(s);
    };

    const scheduleNext = () => {
      if (cancelled) return;
      if (statusPollTimeoutRef.current) {
        window.clearTimeout(statusPollTimeoutRef.current);
      }
      statusPollTimeoutRef.current = window.setTimeout(checkStatus, statusPollDelayRef.current);
    };

    const checkStatus = async () => {
      if (cancelled) return;
      try {
        // **PERMANENT FIX**: Skip attempting to call /status and /health endpoints
        // The minimal bridge only has /qr endpoint, so these calls always result in 404s
        // Instead, we assume bridge is online and let QR fetch via fallback endpoint handle errors
        
        // Set status to "connected" by default - let QR system manage its own state
        setStatusIfChanged('connected');
        setBridgeErrorIfChanged(null);
        statusPollDelayRef.current = 15000;

        setLastStatusData({
          status: 'bridge_minimal_mode',
          note: 'Using minimal bridge (QR only)',
          fallback: 'CRM database for chats/messages'
        });

        // Skip the entire status polling - we'll rely on QR fetch to detect bridge availability
        // This eliminates all the unnecessary 404 requests to /status and /health
        scheduleNext();
      } catch (err) {
        setStatusIfChanged('disconnected');
        const errorMsg = err instanceof Error ? err.message : 'Bridge not reachable';
        
        const isBridgeDown = errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('unreachable');
        const helpfulMsg = isBridgeDown 
          ? 'WhatsApp Bridge is offline. You can still view messages in CRM (database fallback mode).'
          : errorMsg;
        
        setBridgeErrorIfChanged(helpfulMsg);
        setBridgeUnavailable(isBridgeDown);
        
        console.debug('[Bridge Connection Error]', {
          message: errorMsg,
          timestamp: new Date().toISOString(),
          bridgeUrl: bridgeUrl,
        });

        // More aggressive backoff to prevent UI flickering on repeated failures
        statusPollDelayRef.current = Math.min(statusPollDelayRef.current * 2, 120000);
      }

      scheduleNext();
    };

    checkStatus();
    return () => {
      cancelled = true;
      if (statusPollTimeoutRef.current) {
        window.clearTimeout(statusPollTimeoutRef.current);
        statusPollTimeoutRef.current = null;
      }
    };
  }, [bridgeFetch, bridgeUrl]);

  // Load admin user permissions and user list
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) {
      setIsSuperAdmin(false);
      setCurrentUserId(null);
      setCurrentUserName(null);
      return;
    }
    try {
      const u = JSON.parse(userStr);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      const isSA = (u?.userId === 'admin' || u?.userId === 'admincrm') || perms.includes('all');
      setIsSuperAdmin(isSA);
      setCurrentUserId(u?.userId || null);
      setCurrentUserName(u?.name || u?.email || u?.userId || null);
    } catch {
      setIsSuperAdmin(false);
      setCurrentUserId(null);
      setCurrentUserName(null);
    }
  }, []);

  // Auto-load image media when possible (do not auto-load large videos/docs)
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const candidates = messages
      .filter((m: any) => {
        const id = String(m?.id || '');
        if (!id) return false;
        if (!m?.hasMedia) return false;
        if (messageMediaCache[id]?.dataUrl) return false;

        // Avoid retrying the same failed media on every poll
        const fail = mediaFailuresRef.current[id];
        const cooldownMs = 5 * 60_000;
        if (fail?.lastFailAt && Date.now() - fail.lastFailAt < cooldownMs) return false;

        const t = String(m?.type || '').toLowerCase();
        const mt = String(m?.mimetype || m?.mimeType || '').toLowerCase();
        return t === 'image' || mt.startsWith('image/');
      })
      .slice(0, 2);

    candidates.forEach((m: any) => {
      loadMediaForMessage(m);
    });
  }, [messages, messageMediaCache, loadMediaForMessage]);

  // Close assign dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAssignDropdown) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-assign-dropdown]')) {
          setShowAssignDropdown(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAssignDropdown]);

  // Fetch user list for assignment
  useEffect(() => {
    if (!token || !isSuperAdmin) return;

    const loadUsers = async () => {
      try {
        const response = await fetch('/api/admin/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const users = Array.isArray(data?.data) ? data.data : [];
        setUserOptions(
          users
            .map((x: any) => ({
              userId: String(x?.userId || '').trim(),
              name: String(x?.name || x?.email || x?.userId || '').trim(),
              email: String(x?.email || '').trim(),
              permissions: Array.isArray(x?.permissions) ? x.permissions : [],
            }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        );
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();
  }, [token, isSuperAdmin]);

  // Fetch lead details (name, ID, status, label) if leadId is provided
  useEffect(() => {
    // Only fetch if valid MongoDB ObjectId representation
    const isValidId = leadIdParam && /^[0-9a-fA-F]{24}$/.test(String(leadIdParam));
    if (isValidId && token) {
      const fetchLeadDetails = async () => {
        try {
          const response = await fetch(`/api/admin/crm/leads/${leadIdParam}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const lead = await response.json();
            if (lead.name) {
              setActiveName(lead.name);
            }
            if (lead._id) {
              setActiveLeadId(lead._id);
            }
            if (lead.status) {
              setActiveStatus(lead.status);
            }
            if (lead.label) {
              setActiveLabel(lead.label);
            }
            if (lead.leadNumber) {
              setActiveLeadNumber(lead.leadNumber);
            }
          }
        } catch (error) {
          console.error('Failed to fetch lead details:', error);
        }
      };
      
      fetchLeadDetails();
    }
  }, [leadIdParam, token]);

  // Update the synthetic chat in the list when the lead name is fetched
  useEffect(() => {
    if (activeName && activePhone && selectedChat) {
      // Update the selected chat to show the name and lead details
      const updatedChat = {
        ...selectedChat,
        displayName: activeName,
        leadId: activeLeadId,
        leadStatus: activeStatus,
        leadLabel: activeLabel,
      };
      setSelectedChat(updatedChat);
      
      // Also update in the chats list
      setChats((prevChats) =>
        prevChats.map((chat) => {
          const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
          const chatPhone = String(chat.name || chatIdStr || '').replace(/\D/g, '');
          const activePhoneNorm = String(activePhone).replace(/\D/g, '');
          if (chatPhone === activePhoneNorm) {
            return {
              ...chat,
              displayName: activeName,
              leadId: activeLeadId,
              leadStatus: activeStatus,
              leadLabel: activeLabel,
            };
          }
          return chat;
        })
      );
    }
  }, [activeName, activePhone, activeLeadId, activeStatus, activeLabel]);

  // Auto-select chat if phone parameter is provided
  useEffect(() => {
    if (phoneParam && status === 'connected') {
      setActivePhone(phoneParam);
      if (nameParam) setActiveName(nameParam);
      
      // Normalize the phone parameter
      let normalizedPhone = String(phoneParam).replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = '91' + normalizedPhone;
      }
      
      const matchingChat = chats.find((chat) => {
        const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
        const chatPhone = String(chat.name || chatIdStr || '').replace(/\D/g, '');
        return chatPhone === normalizedPhone || chatPhone.endsWith(normalizedPhone);
      });

      if (matchingChat) {
        setSelectedChat(matchingChat);
      } else {
        // Chat not found, create a synthetic chat
        const formatPhone = (phone: string) => {
          let p = phone.replace(/\D/g, '');
          if (!p.startsWith('91') && p.length === 10) {
            p = '91' + p;
          }
          return p + '@c.us';
        };

        const phoneId = formatPhone(phoneParam);
        const syntheticChat = {
          id: { _serialized: phoneId },
          name: phoneParam,
          displayName: nameParam || activeName || phoneParam, // Use name param
          leadId: leadIdParam || activeLeadId,
          isGroup: false,
          isReadOnly: false,
          unreadCount: 0,
          timestamp: null,
          archived: false,
        };

        setChats((prevChats) => {
          const exists = prevChats.some((c) => {
            const cPhone = String(c.name || c.id || '').replace(/\D/g, '');
            return cPhone === normalizedPhone;
          });
          
          if (!exists) {
            return [syntheticChat, ...prevChats];
          }
          return prevChats;
        });

        setSelectedChat(syntheticChat);
      }
    }
  }, [phoneParam, status, nameParam]); // Add nameParam to deps

  // Load chats from CRM database instead of bridge
  useEffect(() => {
    if (status === 'connected' && token) {
      const loadChats = async () => {
        try {
          // **FIX**: Load conversations directly from CRM database
          // This ensures all messages (Meta + QR) are visible in the inbox
          // Load ONLY QR conversations - separate from Meta inbox
          const res = await fetch('/api/admin/crm/conversations?limit=100&provider=qr', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('[loadChats] API response status:', res.status);
          
          if (res.ok) {
            const payload = await res.json();
            const conversations = payload?.data?.conversations || [];
            console.log('[loadChats] Got', conversations.length, 'conversations from CRM');
            
            // Convert CRM conversations to chat format for the UI
            const crmChats = conversations.map((conv: any) => ({
              id: { _serialized: `${conv.phoneNumber}@c.us` },
              name: conv.name || conv.phoneNumber,
              displayName: conv.name !== conv.phoneNumber ? conv.name : null,
              leadId: conv.leadId,
              leadNumber: conv.leadNumber,
              leadStatus: conv.status,
              leadLabel: conv.labels?.[0] || null,
              assignedToUserId: conv.assignedToUserId || null,
              status: conv.status,
              labels: conv.labels || [],
              unreadCount: conv.unreadCount || 0,
              lastMessage: {
                body: conv.lastMessageContent || '',
                timestamp: conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() / 1000 : 0,
                fromMe: conv.lastDirection === 'outbound',
              },
              timestamp: conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() / 1000 : 0,
              isLeadOnly: false,
              _fromCRM: true,
            }));

            console.log('[loadChats] Converted to', crmChats.length, 'chats');
            
            if (crmChats.length > 0) {
              setChats(crmChats);
              // Also cache for offline use
              try {
                localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(crmChats));
              } catch (e) {
                console.debug('[cache] Failed to cache chats:', e);
              }
            } else {
              // Fall back to cached chats if CRM returns empty
              const cached = localStorage.getItem(CHAT_CACHE_KEY);
              if (cached) {
                try {
                  const cachedChats = JSON.parse(cached);
                  setChats(cachedChats);
                } catch (e) {
                  console.debug('[cache] Failed to parse cached chats:', e);
                }
              }
            }
          } else {
            console.warn(`[loadChats] CRM API error ${res.status}`);
            // Fall back to cached chats
            const cached = localStorage.getItem(CHAT_CACHE_KEY);
            if (cached) {
              try {
                const cachedChats = JSON.parse(cached);
                setChats(cachedChats);
              } catch (e) {
                console.debug('[cache] Failed to parse cached chats:', e);
              }
            }
          }
        } catch (err) {
          console.debug('[loadChats] Exception:', err);
          // Silently fail - use cached chats
          const cached = localStorage.getItem(CHAT_CACHE_KEY);
          if (cached) {
            try {
              const cachedChats = JSON.parse(cached);
              setChats(cachedChats);
            } catch (e) {
              console.debug('[cache] Failed to parse cached chats:', e);
            }
          }
        }
        
        // Also fetch groups from bridge and merge them
        try {
          const bridgeChatsRes = await fetch('/api/admin/crm/whatsapp/bridge-proxy?path=/chats', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (bridgeChatsRes.ok) {
            const bridgeData = await bridgeChatsRes.json();
            const bridgeChats = bridgeData.chats || [];
            
            // Filter only groups from bridge chats
            const bridgeGroups = bridgeChats.filter((c: any) => c.isGroup);
            
            if (bridgeGroups.length > 0) {
              setChats(prev => {
                // Merge groups with existing chats (avoid duplicates)
                const existingIds = new Set(prev.map(c => typeof c.id === 'string' ? c.id : c.id._serialized));
                const newGroups = bridgeGroups
                  .filter((g: any) => !existingIds.has(g.id))
                  .map((g: any) => ({
                    id: { _serialized: g.id },
                    name: g.name || 'Group',
                    displayName: g.name,
                    isGroup: true,
                    unreadCount: g.unreadCount || 0,
                    timestamp: g.timestamp || 0,
                    memberCount: g.participants?.length,
                    _fromBridge: true,
                  }));
                
                if (newGroups.length > 0) {
                  console.log(`[loadChats] Added ${newGroups.length} groups from bridge`);
                  return [...prev, ...newGroups];
                }
                return prev;
              });
              
              // Also update groups state
              setGroups(bridgeGroups.map((g: any) => ({
                id: g.id,
                name: g.name || 'Group',
                participants: g.participants || [],
              })));
            }
          }
        } catch (bridgeErr) {
          console.debug('[loadChats] Bridge groups fetch failed:', bridgeErr);
        }
      };

      loadChats();
      const interval = setInterval(loadChats, 45000); // 45s polling
      return () => clearInterval(interval);
    }
  }, [status, token]);

  // Persist selected chat id so it can be restored offline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedChat) return;
    const id = getChatId(selectedChat);
    if (!id) return;
    try {
      localStorage.setItem(CHAT_SELECTED_CACHE_KEY, id);
    } catch (e) {
      console.warn('[cache] Failed to persist selected chat:', e);
    }
  }, [selectedChat]);

  // Persist messages for selected chat (best-effort)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedChat) return;
    if (!Array.isArray(messages) || messages.length === 0) return;
    const msgKey = cacheKeyForChat(selectedChat);
    if (!msgKey) return;
    try {
      localStorage.setItem(msgKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('[cache] Failed to persist messages:', e);
    }
  }, [messages, selectedChat]);

  // Consolidate Lead Data Fetching to avoid "vibration"
  useEffect(() => {
    if (chats.length > 0 && token) {
      const fetchLeadDataForChats = async () => {
        const phonesToFetch = chats
          .filter(chat => {
            if (chat.displayName && chat.leadId) return false; // Already has data
            return chat.name && /^\d+$/.test(String(chat.name).replace(/\D/g, ''));
          })
          .map(chat => {
            let normalizedPhone = String(chat.name).replace(/\D/g, '');
            if (normalizedPhone.length === 10) normalizedPhone = '91' + normalizedPhone;
            return normalizedPhone;
          })
          .filter(phone => !leadDataCache[phone]);

        if (phonesToFetch.length === 0) return;

        // Process in small batches to avoid hitting API too hard, but don't call setChats in loop
        const updates: Record<string, any> = {};
        
        // Only fetch first 10 missing to avoid massive parallel hits
        const batch = phonesToFetch.slice(0, 10);
        
        await Promise.all(batch.map(async (normalizedPhone) => {
          try {
            const response = await fetch(`/api/admin/crm/leads/by-phone/${encodeURIComponent(normalizedPhone)}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const leadResult = await response.json();
            if (response.ok && leadResult.success) {
              updates[normalizedPhone] = leadResult;
            } else {
              updates[normalizedPhone] = { success: false };
            }
          } catch (e) {
            updates[normalizedPhone] = { success: false };
          }
        }));

        // Batch update chats once
        if (Object.keys(updates).length > 0) {
          setLeadDataCache(prev => ({ ...prev, ...updates }));
          setChats(prev => prev.map(chat => {
            let normalizedPhone = String(chat.name || '').replace(/\D/g, '');
            if (normalizedPhone.length === 10) normalizedPhone = '91' + normalizedPhone;
            const update = updates[normalizedPhone];
            if (update && update.success) {
              return {
                ...chat,
                displayName: update.name,
                leadId: update._id,
                leadNumber: update.leadNumber, // Added
                leadStatus: update.status,
                leadLabel: update.label,
                assignedToUserId: update.assignedToUserId || null,
              };
            }
            return chat;
          }));
        }
      };
      
      // Delay initial fetch slightly to let main chats load
      const timeout = setTimeout(fetchLeadDataForChats, 2000);
      return () => clearTimeout(timeout);
    }
  }, [chats.length, token]);

  // Load messages for selected chat - handle 404 to stop loop
  const [last404Chat, setLast404Chat] = useState<string | null>(null);

  // Fallback: Load messages from CRM database (for incoming/outgoing stored messages)
  // This is defined at component level so it can be used in multiple places
  const loadMessagesFromCRM = useCallback(async () => {
    try {
      // Get phone from activePhone or from selectedChat
      let phoneToUse = activePhone;
      if (!phoneToUse && selectedChat) {
        const chatIdStr = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id?._serialized || '';
        phoneToUse = chatIdStr.split('@')[0].replace(/\D/g, '');
      }
      
      if (!activeLeadId && !phoneToUse) return [];
      
      const params = new URLSearchParams();
      if (activeLeadId) params.append('leadId', activeLeadId);
      if (phoneToUse) params.append('phoneNumber', phoneToUse);
      params.append('provider', 'qr'); // QR inbox only shows QR bridge messages
      params.append('limit', '200');
      params.append('order', 'asc');
      
      const res = await fetch(`/api/admin/crm/messages?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const payload = await res.json();
        const crmMessages = payload?.data?.messages || [];
        
        // Convert CRM messages to display format
        return crmMessages.map((msg: any) => {
          // Convert status to ack for tick display
          const statusToAck = (status: string) => {
            if (status === 'read') return 3;      // Blue double tick
            if (status === 'delivered') return 2; // Double tick
            if (status === 'sent') return 1;      // Single tick
            return 0;                             // Pending/no tick
          };
          
          const isOutbound = msg.direction === 'outbound';
          
          // Extract media URL from the media object (CRM stores as media.url)
          const mediaUrl = msg.media?.url || msg.mediaUrl;
          const mediaType = msg.media?.kind || msg.messageType || 'text';
          const mimeType = msg.media?.mimeType || msg.mimeType || '';
          
          return {
            // Use waMessageId for media fetching (bridge needs WhatsApp ID, not MongoDB ID)
            // Keep _id as fallback for display but waMessageId is required for bridge media calls
            id: msg.waMessageId || msg._id,
            _id: msg._id, // Store MongoDB ID separately for CRM operations
            waMessageId: msg.waMessageId, // Store WhatsApp ID for bridge media calls
            body: msg.messageContent || '',
            timestamp: msg.sentAt ? new Date(msg.sentAt).getTime() : 0,
            from: isOutbound ? 'Me' : msg.phoneNumber,
            to: isOutbound ? msg.phoneNumber : undefined,
            fromMe: isOutbound,
            type: mediaType,
            status: msg.status,
            ack: isOutbound ? statusToAck(msg.status) : 0, // Only show ticks for outbound
            // Media fields - extracted from CRM schema
            mediaUrl: mediaUrl,
            mimeType: mimeType,
            hasMedia: Boolean(mediaUrl),
            // Admin sender info for outbound messages
            sentByLabel: msg.sentByLabel,
            senderDisplayName: msg.senderDisplayName,
            _crmMessage: true,
          };
        });
      }
    } catch (err) {
      console.warn('[CRM Message Load Error]:', err);
    }
    return [];
  }, [activeLeadId, activePhone, selectedChat, token]);

  // Load messages from Bridge directly
  const loadMessagesFromBridge = useCallback(async (chatId: string) => {
    try {
      const res = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 15000);
      if (res.ok) {
        const data = await res.json();
        const bridgeMessages = data?.messages || [];
        return bridgeMessages.map((msg: any) => ({
          id: msg.id,
          body: msg.body || '',
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          type: msg.type || 'text',
          hasMedia: msg.hasMedia,
          ack: msg.ack,
          _bridgeMessage: true,
        }));
      }
    } catch (err) {
      console.debug('[loadMessagesFromBridge] Error:', err);
    }
    return [];
  }, [bridgeFetch]);

  // Load messages from CRM when a chat is selected (regardless of bridge status)
  useEffect(() => {
    if (selectedChat) {
      const chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id?._serialized || '';
      
      // If this is a new "Lead Only" entry (no real chat yet), don't even try to fetch messages
      if (selectedChat.isLeadOnly && !messages.length) {
        setMessages([]);
        return;
      }

      // Skip if this chat returned 404 recently (new lead)
      if (chatId === last404Chat) return;

      const loadMessages = async () => {
        try {
          // Load messages from CRM database first
          const crmMessages = await loadMessagesFromCRM();
          if (crmMessages.length > 0) {
            setMessages(crmMessages);
            setBridgeError(null);
            setLast404Chat(null);
          } else {
            // If CRM has no messages, try loading directly from bridge
            const bridgeMessages = await loadMessagesFromBridge(chatId);
            if (bridgeMessages.length > 0) {
              setMessages(bridgeMessages);
              setBridgeError(null);
              setLast404Chat(null);
            } else {
              setLast404Chat(chatId);
              if (messages.length !== 0) {
                setMessages([]);
              }
            }
          }
        } catch (err) {
          console.debug('[loadMessages] Exception:', err);
          // Silently fail - use cached messages
        }
      };

      loadMessages();
      // Poll for new messages every 8 seconds
      const interval = setInterval(loadMessages, 8000);
      return () => clearInterval(interval);
    } else {
      setLast404Chat(null);
    }
  }, [selectedChat, last404Chat, messages.length, loadMessagesFromCRM, loadMessagesFromBridge]);

  // Auto-scroll to latest message - only if messages actually changed
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastMessageId]);

  // Fetch lead data by phone number
  const fetchLeadByPhone = async (phoneNumber: string) => {
    if (!token || !phoneNumber) return null;
    
    // Check cache first
    const normalizedPhone = String(phoneNumber).replace(/\D/g, '');
    if (leadDataCache[normalizedPhone]) {
      return leadDataCache[normalizedPhone];
    }
    
    try {
      const response = await fetch(`/api/admin/crm/leads/by-phone/${encodeURIComponent(normalizedPhone)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const lead = await response.json();
      if (response.ok) {
        // Cache even if not found to prevent repeating requests
        setLeadDataCache((prev) => ({
          ...prev,
          [normalizedPhone]: lead,
        }));
        return lead.success ? lead : null;
      }
    } catch (error) {
      console.error('Failed to fetch lead by phone:', error);
    }
    
    return null;
  };

  // Save sidebar CRM data
  const handleSaveSidebar = async () => {
    if (!activeLeadId || !token) {
      showToast('No lead selected', 'error');
      return;
    }
    
    setSavingSidebar(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/${activeLeadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: sidebarData.status || undefined,
          labels: sidebarData.labels.length > 0 ? sidebarData.labels : undefined,
          notes: sidebarData.notes || undefined,
          nextFollowUp: sidebarData.followUpDate || undefined,
        }),
      });
      
      if (res.ok) {
        showToast('Lead updated successfully', 'success');
        // Update local state
        if (sidebarData.status) setActiveStatus(sidebarData.status.toUpperCase());
        if (sidebarData.labels[0]) setActiveLabel(sidebarData.labels[0]);
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to update lead', 'error');
      }
    } catch (err: any) {
      console.error('Failed to save sidebar:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setSavingSidebar(false);
    }
  };

  // Load sidebar data when lead changes
  useEffect(() => {
    if (!activeLeadId || !token) {
      setSidebarData({ status: '', labels: [], notes: '', followUpDate: '', assignedTo: '' });
      return;
    }
    
    const loadLeadDetails = async () => {
      try {
        const res = await fetch(`/api/admin/crm/leads/${activeLeadId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const lead = await res.json();
          setSidebarData({
            status: lead.status || '',
            labels: lead.labels || [],
            notes: lead.notes || '',
            followUpDate: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
            assignedTo: lead.assignedToUserId || '',
          });
        }
      } catch (e) {
        console.warn('Failed to load lead details for sidebar:', e);
      }
    };
    
    loadLeadDetails();
  }, [activeLeadId, token]);

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
        const res = await fetch('/api/admin/crm/spell-suggest', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
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
  }, [token]);

  // Apply spelling correction
  const applySuggestion = useCallback((suggestion: string) => {
    if (!spellSuggestions) return;
    setNewMessage(prev => prev.replace(new RegExp(`\\b${spellSuggestions.word}\\b`, 'gi'), suggestion));
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

  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingMedia.length === 0 && !templateMediaUrl) || !selectedChat || sending || isSendingRef.current) return;

    // CHECK PERMISSIONS: Non-super-admins can only message assigned leads
    if (!isSuperAdmin && activeLeadId && !assignedLeadIds.has(activeLeadId)) {
      alert('❌ You can only message customers assigned to you. Please add this lead to your account first.');
      return;
    }

    setSending(true);
    isSendingRef.current = true;
    try {
      let chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized;
      
      // Normalize chatId: handle both phone chats (@c.us) and group chats (@g.us)
      if (!chatId.includes('@') || chatId.includes('@lid')) {
        // Fix @lid to @c.us (invalid format from some Bridge versions)
        const baseId = chatId.replace('@lid', '').replace(/\D/g, '');
        
        // Check if it's a group ID (long numeric)
        if (baseId.length > 15 && /^\d+$/.test(baseId)) {
          // Group ID
          chatId = baseId + '@g.us';
        } else {
          // Phone number - remove non-digits and format
          chatId = baseId + '@c.us';
        }
      }

      // 1. Send Media first if any
      if (pendingMedia.length > 0) {
        setUploadingMedia(true);
        for (let i = 0; i < pendingMedia.length; i++) {
          const file = pendingMedia[i];
          const fileId = `${file.name}-${Date.now()}`;
          setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

          // Determine media type from MIME type
          const getMimeTypeCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'audio';
            return 'document';
          };
          const mediaType = getMimeTypeCategory(file.type);

          // Upload to S3/Server
          const uploadResult = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                setUploadProgress(prev => ({ ...prev, [fileId]: percentComplete }));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  if (!response.url) {
                    reject(new Error('Server did not return media URL'));
                  } else {
                    resolve(response);
                  }
                } catch (e) {
                  reject(new Error(`Invalid response from server: ${e}`));
                }
              } else {
                // Try to parse error response
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  const errorMsg = errorData.error || errorData.message || 'Unknown error';
                  reject(new Error(`Upload failed (${xhr.status}): ${errorMsg}`));
                } catch {
                  reject(new Error(`Upload failed with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error - check bridge connection')));
            xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));
            xhr.open('POST', '/api/admin/crm/whatsapp/media-upload');
            // Headers for auth/bridge
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
          });

          const uploadData = uploadResult as any;
          if (!uploadData.url) {
            throw new Error('Upload failed - server returned no URL');
          }
          
          // Validate media URL format
          const mediaUrl = uploadData.url as string;
          if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
            throw new Error('Invalid media URL format - must be HTTPS');
          }
          
          // Add optimistic UI: show message immediately
          const optimisticMessage = {
            id: `opt-${Date.now()}-${i}`,
            fromMe: true,
            timestamp: new Date(),
            type: mediaType, // Now supports 'image', 'video', 'audio', 'document'
            body: i === 0 ? newMessage : '',
            mediaUrl: mediaUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            status: 'pending' // Mark as pending until bridge confirms
          };
          setMessages(prev => [...prev, optimisticMessage]);

          // Send media via server API (adds admin attribution + logs in DB)
          try {
            const normalizedType = mediaType === 'audio' ? 'document' : mediaType;
            const mediaRes = await fetch('/api/admin/crm/whatsapp/qr/send', {
              method: 'POST',
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: chatId,
                type: normalizedType,
                url: mediaUrl,
                caption: i === 0 ? newMessage : '',
                leadId: activeLeadId || undefined,
              }),
            });

            if (!mediaRes.ok) {
              const sendError = await parseBridgeError(mediaRes);
              // Mark optimistic message as failed
              setMessages(prev => 
                prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'failed' } : m)
              );
              throw new Error(`Failed to send image ${i + 1}: ${sendError}`);
            }

            // Best effort: update optimistic message to sent + replace id with server messageId
            let serverMessageId: string | null = null;
            try {
              const sentData = await mediaRes.json();
              if (typeof sentData?.messageId === 'string' && sentData.messageId) {
                serverMessageId = sentData.messageId;
              }
            } catch {
              // ignore
            }

            setMessages(prev =>
              prev.map(m => {
                if (m.id !== optimisticMessage.id) return m;
                return {
                  ...m,
                  status: 'sent',
                  ...(serverMessageId ? { id: serverMessageId } : {}),
                };
              })
            );
          } catch (sendErr) {
            console.error(`Media send error for file ${i + 1}:`, sendErr);
            throw sendErr;
          }
          
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }
        
        // Clear media state
        mediaPreviews.forEach(p => URL.revokeObjectURL(p));
        setPendingMedia([]);
        setMediaPreviews([]);
        setUploadingMedia(false);
        setNewMessage(''); // Caption was sent
        showToast(`✅ ${pendingMedia.length} file(s) sent successfully`, 'success');
      } else if (selectedTemplate && templateMediaUrl) {
        // 2. Send Template - try Meta first, fallback to QR if offline
        console.log('[sendMessage] Sending template:', selectedTemplate.templateName);
        
        // Add optimistic UI showing template card
        const optimisticMessage = {
          id: `opt-${Date.now()}`,
          fromMe: true,
          timestamp: new Date(),
          type: 'template',
          body: newMessage,
          status: 'pending',
          mediaUrl: templateMediaUrl,
          templateName: selectedTemplate.templateName
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        const phoneNumber = chatId.replace(/@.*$/, '').replace(/\D/g, '');
        let sendSuccess = false;
        let sentVia = '';
        
        // Try Meta Cloud API first (sends actual template with button)
        try {
          console.log('[sendMessage] Trying Meta Cloud API...');
          const metaRes = await fetch('/api/admin/crm/whatsapp/send-template', {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber,
              templateId: selectedTemplate._id,
              leadId: activeLeadId || undefined
            })
          });

          const metaData = await metaRes.json().catch(() => ({}));
          
          if (metaRes.ok && metaData.success) {
            setMessages(prev => 
              prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'sent', waMessageId: metaData.data?.waMessageId } : m)
            );
            sendSuccess = true;
            sentVia = 'Meta';
          }
        } catch (metaErr) {
          console.log('[sendMessage] Meta failed, trying QR...', metaErr);
        }
        
        // If Meta failed and QR bridge is connected, try QR (image + text, no native button)
        if (!sendSuccess && status === 'connected') {
          try {
            console.log('[sendMessage] Trying QR Bridge...');
            const qrRes = await fetch('/api/admin/crm/whatsapp/qr/send', {
              method: 'POST',
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: chatId,
                message: newMessage,
                type: 'media',
                media: templateMediaUrl,
                caption: newMessage,
                leadId: activeLeadId || undefined
              })
            });

            if (qrRes.ok) {
              const qrData = await qrRes.json().catch(() => ({}));
              setMessages(prev => 
                prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'sent', waMessageId: qrData.id } : m)
              );
              sendSuccess = true;
              sentVia = 'QR';
            }
          } catch (qrErr) {
            console.log('[sendMessage] QR also failed:', qrErr);
          }
        }
        
        if (sendSuccess) {
          setNewMessage('');
          setTemplateMediaUrl(null);
          setSelectedTemplate(null);
          showToast(`✅ Template sent via ${sentVia}!`, 'success');
        } else {
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'failed' } : m)
          );
          showToast('❌ Failed to send template via Meta and QR', 'error');
        }
      } else if (templateMediaUrl) {
        // 2b. Send just media URL (no template selected, just image with caption)
        console.log('[sendMessage] Sending media URL:', templateMediaUrl);
        
        // Add optimistic UI
        const optimisticMessage = {
          id: `opt-${Date.now()}`,
          fromMe: true,
          timestamp: new Date(),
          type: 'image',
          body: newMessage,
          status: 'pending',
          mediaUrl: templateMediaUrl
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        const res = await fetch('/api/admin/crm/whatsapp/send', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: chatId.replace(/@.*$/, ''), // Remove @c.us suffix
            messageContent: newMessage,
            media: { url: templateMediaUrl, kind: 'image' },
            provider: 'qr', // Use QR Bridge
            leadId: activeLeadId || undefined
          })
        });

        if (res.ok) {
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'sent' } : m)
          );
          setNewMessage('');
          setTemplateMediaUrl(null);
          showToast('✅ Image sent with caption', 'success');
        } else {
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'failed' } : m)
          );
          const err = await parseBridgeError(res);
          setBridgeError(err);
          showToast(`❌ Failed to send: ${err}`, 'error');
        }
      } else {
        // 2. Clear Text only if no media
        console.log('[sendMessage] Sending to chat:', chatId, 'message:', newMessage);
        
        // Add optimistic UI: show message immediately
        const optimisticMessage = {
          id: `opt-${Date.now()}`,
          fromMe: true,
          timestamp: new Date(),
          type: 'text',
          body: newMessage,
          status: 'pending'
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        const res = await fetch('/api/admin/crm/whatsapp/qr/send', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: chatId, message: newMessage, type: 'text', leadId: activeLeadId || undefined })
        });

        if (res.ok) {
          // Update optimistic message to sent
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'sent' } : m)
          );
          setNewMessage('');
          showToast('✅ Message sent', 'success');
        } else {
          // Mark optimistic message as failed
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? { ...m, status: 'failed' } : m)
          );
          const err = await parseBridgeError(res);
          setBridgeError(err);
          showToast(`❌ Failed to send: ${err}`, 'error');
        }
      }

      setLast404Chat(null);
      
      // **PERMANENT FIX**: Skip bridge message reload, go directly to CRM
      try {
        const crmMessages = await loadMessagesFromCRM();
        if (crmMessages.length > 0) {
          setMessages(crmMessages);
        }
      } catch (err) {
        console.debug('[Message Reload] Failed to load messages:', err);
      }

      // Auto scroll to bottom
      setTimeout(() => {
        if (msgContainerRef.current) {
          msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
        }
      }, 100);

      // Mark as read in CRM
      if (activeLeadId || activePhone) {
        try {
          const markReadRes = await fetch('/api/admin/crm/messages', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ 
              action: 'markThreadAsRead', 
              ...(activeLeadId && { leadId: activeLeadId }),
              ...(activePhone && { phoneNumber: activePhone })
            }),
          });
          if (!markReadRes.ok) {
            const errorData = await markReadRes.json().catch(() => ({}));
            console.warn('[Mark As Read] API error:', markReadRes.status, errorData.error);
          }
        } catch (err) {
          console.warn('[Mark As Read] Failed:', err instanceof Error ? err.message : String(err));
        }
      }
      
      setBridgeError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      console.error('[sendMessage] Error:', err);
      setBridgeError(errorMsg);
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setSending(false);
      isSendingRef.current = false;
      setUploadingMedia(false);
      setUploadProgress({});
    }
  };

  // Prepare media for sending (show preview)
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat || !event.target.files) return;

    // CHECK PERMISSIONS: Non-super-admins can only send media to assigned leads
    if (!isSuperAdmin && activeLeadId && !assignedLeadIds.has(activeLeadId)) {
      alert('❌ You can only send media to customers assigned to you. Please add this lead to your account first.');
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Next.js App Router API routes have a default limit (usually 4MB)
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit
    const largeFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (largeFiles.length > 0) {
      alert(`❌ File too large: ${largeFiles[0].name} is over 4.5MB. \n\nPlease resize the image or upload a smaller file.`);
      return;
    }

    console.log('[handleMediaUpload] Preparing', files.length, 'files for preview');
    setPendingMedia(prev => [...prev, ...files]);
    
    // Generate previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setShowMediaMenu(false);
    
    // Reset file input so same file can be selected again if removed
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  const removePendingMedia = (index: number) => {
    setPendingMedia(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setMediaPreviews(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      return next;
    });
  };

  // Create new lead and open chat
  const handleCreateNewLead = async () => {
    if (!newLeadForm.phone.trim()) {
      setBridgeError('Phone number is required');
      return;
    }

    setCreatingLead(true);
    setBridgeError(null);
    try {
      // Create lead in CRM database
      const createRes = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLeadForm.name.trim() || 'New Lead',
          email: newLeadForm.email.trim() || '',
          phoneNumber: newLeadForm.phone.trim(),
          status: 'lead',
          source: 'qr_whatsapp',
          workshopName: newLeadForm.workshopName.trim() || undefined,
          assignedToUserId: newLeadForm.assignedToUserId.trim() || undefined,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData?.error || 'Failed to create lead');
      }

      const leadId = createData.data?._id;
      const leadName = createData.data?.name || newLeadForm.name || 'New Lead';
      const leadStatus = createData.data?.status || 'lead';
      const leadPhone = newLeadForm.phone.trim();

      console.log('[NewLead] Created lead:', leadId, 'Name:', leadName, 'Status:', leadStatus);

      // Close modal and reset form
      setShowNewLeadModal(false);
      setNewLeadForm({ name: '', email: '', phone: '', source: 'qr-whatsapp', status: 'lead', workshopName: '', assignedToUserId: '' });

      // Set the lead details in state so header shows ID and status
      if (leadId) {
        setActiveLeadId(leadId);
        setActiveName(leadName);
        setActiveStatus(leadStatus);
        setActivePhone(leadPhone);
      }

      // Try to find and open the chat for this number
      let normalizedPhone = newLeadForm.phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = '91' + normalizedPhone;
      }

      const matchingChat = chats.find((chat) => {
        const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
        const chatPhone = String(chat.name || chatIdStr || '').replace(/\D/g, '');
        return chatPhone === normalizedPhone || chatPhone.endsWith(normalizedPhone);
      });

      if (matchingChat) {
        setSelectedChat(matchingChat);
        setBridgeError(null);
      } else {
        // Chat not yet available, create a synthetic chat for this lead
        console.log('[NewLead] Chat not found, creating synthetic chat for:', leadPhone);
        
        // Format phone number to WhatsApp format
        let phoneId = leadPhone.replace(/\D/g, '');
        if (!phoneId.startsWith('91') && phoneId.length === 10) {
          phoneId = '91' + phoneId;
        }
        phoneId = phoneId + '@c.us';
        
        const syntheticChat = {
          id: { _serialized: phoneId },
          name: leadPhone,
          displayName: leadName,
          isGroup: false,
          isReadOnly: false,
          unreadCount: 0,
          timestamp: null,
          archived: false,
          leadId: leadId,
          leadStatus: leadStatus,
          leadLabel: undefined,
        };
        
        // Add synthetic chat to list
        setChats((prevChats) => {
          const exists = prevChats.some((c) => {
            const cPhone = String(c.name || c.id || '').replace(/\D/g, '');
            return cPhone === normalizedPhone;
          });
          
          if (!exists) {
            return [syntheticChat, ...prevChats];
          }
          return prevChats;
        });
        
        setSelectedChat(syntheticChat);
        setBridgeError(`✓ Lead "${leadName}" created and chat ready for messaging.`);
        setTimeout(() => setBridgeError(null), 3000);
      }
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setCreatingLead(false);
    }
  };

  // ============ QUICK REPLY HANDLERS ============
  const addQuickReply = () => {
    if (!newQuickReply.trim()) return;
    const newReply = {
      id: String(Date.now()),
      message: newQuickReply
    };
    setQuickReplies([...quickReplies, newReply]);
    setNewQuickReply('');
  };

  const deleteQuickReply = (id: string) => {
    setQuickReplies(quickReplies.filter(r => r.id !== id));
  };

  const insertQuickReply = (message: string) => {
    setNewMessage(prev => prev + (prev ? ' ' : '') + message);
    setShowQuickReplies(false);
  };

  // ============ TEMPLATE HANDLERS ============
  const addTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.message.trim()) return;
    const template = {
      id: 't' + String(Date.now()),
      name: newTemplate.name,
      message: newTemplate.message
    };
    setTemplates([...templates, template]);
    setNewTemplate({ name: '', message: '' });
    setShowTemplateForm(false);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const insertTemplate = (message: string) => {
    setNewMessage(message);
    setShowTemplates(false);
  };

  // ============ SCHEDULE & DELAY HANDLERS ============
  const calculateDelayMs = (): number => {
    const days = parseInt(delayDays) || 0;
    const hours = parseInt(delayHours) || 0;
    const minutes = parseInt(delayMinutes) || 0;
    const seconds = parseInt(delaySeconds) || 0;
    
    return (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
  };

  const handleScheduledSend = async () => {
    if (sending || isSendingRef.current || !newMessage.trim() || !selectedChat) return;
    
    const delayMs = calculateDelayMs();
    const scheduledTime = new Date(Date.now() + delayMs);
    
    console.log('[ScheduledSend] Will send at:', scheduledTime, 'Delay:', delayMs + 'ms');
    
    // For now, set a timeout to send later
    if (useDelay && delayMs > 0) {
      setTimeout(() => {
        handleSendMessage();
      }, delayMs);
      
      setNewMessage('');
      setShowSchedulePanel(false);
      setBridgeError(null);
      alert(`Message scheduled to send in ${delayDays}d ${delayHours}h ${delayMinutes}m ${delaySeconds}s`);
    } else if (useSchedule && scheduleDateTime) {
      const targetTime = new Date(scheduleDateTime).getTime();
      const now = Date.now();
      const delayUntilSchedule = targetTime - now;
      
      if (delayUntilSchedule <= 0) {
        setBridgeError('Schedule time must be in the future');
        return;
      }
      
      console.log('[ScheduledSend] Delay until:', delayUntilSchedule + 'ms');
      
      setTimeout(() => {
        handleSendMessage();
      }, delayUntilSchedule);
      
      setNewMessage('');
      setShowSchedulePanel(false);
      setBridgeError(null);
      alert(`Message scheduled to send at ${new Date(targetTime).toLocaleString()}`);
    } else {
      await handleSendMessage();
      setShowSchedulePanel(false);
    }
  };

  // Connect
  const handleConnect = async () => {
    try {
      console.log('[handleConnect] Starting...');
      setConnecting(true);
      setBridgeError(null);
      
      // Immediately open the modal
      console.log('[handleConnect] Opening modal...');
      setShowQRModal(true);

      // Call /connect endpoint to reset bridge session
      console.log('[handleConnect] Calling /connect to initialize bridge...');
      await bridgeFetch('/connect', { method: 'POST' }, 15_000).catch(() => null);

      // Wait for bridge to initialize QR code
      console.log('[handleConnect] Waiting 3 seconds for bridge QR generation...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Fetch and display QR
      console.log('[handleConnect] Fetching QR...');
      await refreshQr();
      console.log('[handleConnect] Success!');
      
      setBridgeError('🔐 Scan QR with WhatsApp. Keep scanning until you get "Successfully authenticated".');
    } catch (err) {
      console.warn('[handleConnect] Error:', err instanceof Error ? err.message : 'Failed to connect');
      setBridgeError('Error connecting to bridge. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleReconnect = async () => {
    // Quick reconnect for disconnected state
    setStatus('loading');
    await handleConnect();
  };

  const loadContactDetails = async (contactId: string) => {
    try {
      // Get the _serialized ID if it's an object
      const id = typeof contactId === 'string' ? contactId : (contactId as any)?._serialized;
      if (!id) {
        console.warn('[loadContactDetails] No valid contact ID');
        return;
      }
      
      const res = await bridgeFetch(`/contact/${encodeURIComponent(id)}`, { method: 'GET' }, 10_000);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.contact) {
          setContactDetails({
            ...data.contact,
            name: data.contact.name || data.contact.pushname || data.contact.number,
            profilePicture: data.contact.profilePicUrl,
          });
          setShowContactPanel(true);
        }
      } else {
        const err = await parseBridgeError(res);
        console.warn('[loadContactDetails] Failed:', err);
        // Show basic details from selected chat
        if (selectedChat) {
          setContactDetails({
            name: selectedChat.name,
            number: activePhone || selectedChat.id?.replace?.('@c.us', ''),
            profilePicture: selectedChat.profilePicture,
          });
          setShowContactPanel(true);
        }
      }
    } catch (err) {
      console.error('Failed to load contact details:', err);
      // Fallback to basic details
      if (selectedChat) {
        setContactDetails({
          name: selectedChat.name,
          number: activePhone || selectedChat.id?.replace?.('@c.us', ''),
          profilePicture: selectedChat.profilePicture,
        });
        setShowContactPanel(true);
      }
    }
  };

  // Load groups list from bridge
  const loadGroupsList = useCallback(async () => {
    if (status !== 'connected') return;
    
    setLoadingGroups(true);
    try {
      const res = await bridgeFetch('/groups', { method: 'GET' }, 15_000);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      } else {
        // Try to get groups from the chats list (fallback)
        const groupsFromChats = chats.filter(c => c.isGroup);
        setGroups(groupsFromChats);
      }
    } catch (err) {
      console.warn('[loadGroupsList] Failed:', err);
      // Fallback: filter groups from existing chats
      const groupsFromChats = chats.filter(c => c.isGroup);
      setGroups(groupsFromChats);
    } finally {
      setLoadingGroups(false);
    }
  }, [bridgeFetch, status, chats]);

  // Create new group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupParticipants.trim()) {
      showToast('Please enter group name and at least one participant', 'error');
      return;
    }
    
    setCreatingGroup(true);
    try {
      // Parse participants (comma-separated phone numbers)
      const participants = newGroupParticipants
        .split(',')
        .map(p => p.trim().replace(/\D/g, ''))
        .filter(p => p.length >= 10);
      
      if (participants.length === 0) {
        showToast('Please enter valid phone numbers', 'error');
        return;
      }
      
      const res = await bridgeFetch('/groups/create', {
        method: 'POST',
        body: JSON.stringify({
          name: newGroupName.trim(),
          participants
        })
      }, 15_000);
      
      if (res.ok) {
        const data = await res.json();
        showToast(`Group "${newGroupName}" created!`, 'success');
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupParticipants('');
        // Refresh groups list
        await loadGroupsList();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create group', 'error');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast('Failed to create group', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Load groups when tab changes
  useEffect(() => {
    if (sidebarTab === 'groups' && status === 'connected') {
      loadGroupsList();
    }
  }, [sidebarTab, status, loadGroupsList]);

  // Load group details
  const loadGroupDetails = async (groupId: string | { _serialized: string }) => {
    try {
      // Get the _serialized ID if it's an object
      const id = typeof groupId === 'string' ? groupId : groupId?._serialized;
      if (!id) {
        console.warn('[loadGroupDetails] No valid group ID');
        return;
      }
      
      const res = await bridgeFetch(`/group/${encodeURIComponent(id)}`, { method: 'GET' }, 15_000);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.group) {
          setGroupDetails(data.group);
          setEditGroupName(data.group.name || '');
          setEditGroupDesc(data.group.description || '');
          setShowGroupPanel(true);
        }
      } else {
        const err = await parseBridgeError(res);
        console.warn('[loadGroupDetails] Failed:', err);
        // Show basic details from selected chat
        if (selectedChat) {
          setGroupDetails({
            id: id,
            name: selectedChat.name,
            participants: [],
            participantCount: selectedChat.memberCount || 0,
          });
          setEditGroupName(selectedChat.name || '');
          setEditGroupDesc('');
          setShowGroupPanel(true);
        }
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
      // Fallback to basic details
      if (selectedChat) {
        const id = typeof groupId === 'string' ? groupId : groupId?._serialized;
        setGroupDetails({
          id: id,
          name: selectedChat.name,
          participants: [],
          participantCount: selectedChat.memberCount || 0,
        });
        setEditGroupName(selectedChat.name || '');
        setEditGroupDesc('');
        setShowGroupPanel(true);
      }
    }
  };

  // Update group settings
  const updateGroupSettings = async (settings: any) => {
    if (!groupDetails) return;
    try {
      setIsUpdatingGroup(true);
      const chatId = groupDetails.id;
      
      // Handle different update types
      if (settings.subject) {
        // Update group name/subject
        const res = await bridgeFetch(`/group/${encodeURIComponent(chatId)}/subject`, {
          method: 'POST',
          body: JSON.stringify({ subject: settings.subject })
        }, 10_000);
        
        if (!res.ok) {
          const err = await parseBridgeError(res);
          showToast(`Failed to update group name: ${err}`, 'error');
          return;
        }
        showToast('Group name updated!', 'success');
      }
      
      if (settings.description !== undefined) {
        // Update group description
        const res = await bridgeFetch(`/group/${encodeURIComponent(chatId)}/description`, {
          method: 'POST',
          body: JSON.stringify({ description: settings.description })
        }, 10_000);
        
        if (!res.ok) {
          const err = await parseBridgeError(res);
          showToast(`Failed to update description: ${err}`, 'error');
          return;
        }
        showToast('Group description updated!', 'success');
      }
      
      // Refresh group details
      await loadGroupDetails(chatId);
      setIsEditingGroupName(false);
      setIsEditingGroupDesc(false);
    } catch (err) {
      console.error('Failed to update group settings:', err);
      showToast('Network error while updating group', 'error');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Add member to group
  const handleAddMember = async () => {
    if (!groupDetails || !newMemberPhone.trim()) return;
    
    setAddingMember(true);
    try {
      const res = await bridgeFetch(`/group/${encodeURIComponent(groupDetails.id)}/add`, {
        method: 'POST',
        body: JSON.stringify({ participants: [newMemberPhone.trim()] })
      }, 15_000);
      
      if (res.ok) {
        showToast('Member added successfully!', 'success');
        setNewMemberPhone('');
        setShowAddMemberModal(false);
        // Refresh group details
        await loadGroupDetails(groupDetails.id);
      } else {
        const err = await parseBridgeError(res);
        showToast(`Failed to add member: ${err}`, 'error');
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      showToast('Failed to add member', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  // Get group invite link
  const handleGetInviteLink = async () => {
    if (!groupDetails) return;
    
    setGettingInviteLink(true);
    try {
      const res = await bridgeFetch(`/group/${encodeURIComponent(groupDetails.id)}/invite`, { method: 'GET' }, 10_000);
      
      if (res.ok) {
        const data = await res.json();
        if (data.inviteLink) {
          setGroupDetails({ ...groupDetails, inviteCode: data.inviteCode, inviteLink: data.inviteLink });
          navigator.clipboard.writeText(data.inviteLink);
          showToast('Invite link copied!', 'success');
        }
      } else {
        const err = await parseBridgeError(res);
        showToast(`Failed to get invite link: ${err}`, 'error');
      }
    } catch (err) {
      console.error('Failed to get invite link:', err);
      showToast('Failed to get invite link', 'error');
    } finally {
      setGettingInviteLink(false);
    }
  };

  // Remove participant from group
  const handleRemoveParticipant = async (participantId: string) => {
    if (!groupDetails) return;
    if (!confirm('Remove this member from the group?')) return;
    
    try {
      const res = await bridgeFetch(`/group/${encodeURIComponent(groupDetails.id)}/remove`, {
        method: 'POST',
        body: JSON.stringify({ participant: participantId })
      }, 10_000);
      
      if (res.ok) {
        showToast('Member removed!', 'success');
        await loadGroupDetails(groupDetails.id);
      } else {
        const err = await parseBridgeError(res);
        showToast(`Failed to remove member: ${err}`, 'error');
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      showToast('Failed to remove member', 'error');
    }
  };

  // Mark chat as read
  const markChatAsRead = async (chat: any) => {
    try {
      // Update the chat in state immediately to show read
      const chatId = typeof chat.id === 'string' ? chat.id : chat.id?._serialized;
      if (!chatId) return;

      setChats((prev) =>
        prev.map((c) => {
          const cId = typeof c.id === 'string' ? c.id : c.id?._serialized;
          if (cId === chatId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        })
      );

      // Call API to mark as read on backend (Uses unified messages endpoint)
      // If we have a leadId, pass it to mark thread as read
      const payload: any = {
        action: 'markThreadAsRead',
        phoneNumber: chat.name?.replace(/\D/g, ''),
        leadId: chat.leadId || null
      };

      await fetch(`/api/admin/crm/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to mark chat as read:', err);
    }
  };

  // Assign chat/lead to a user
  const handleAssignChat = async (chat: any, assignToUserId: string) => {
    if (!chat || assigningChat) return;
    
    setAssigningChat(true);
    try {
      // Extract phone number from chat
      const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
      const phoneFromId = chatIdStr.split('@')[0].replace(/\D/g, '');
      
      if (chat.leadId) {
        // If chat already has a leadId, update the lead's assignment
        const res = await fetch(`/api/admin/crm/leads/${chat.leadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignedToUserId: assignToUserId || null })
        });
        
        if (res.ok) {
          showToast(`Lead assigned successfully!`, 'success');
          // Update the chat in state
          setChats(prev => prev.map(c => {
            const cId = typeof c.id === 'string' ? c.id : c.id?._serialized;
            const targetId = typeof chat.id === 'string' ? chat.id : chat.id?._serialized;
            if (cId === targetId) {
              return { ...c, assignedToUserId: assignToUserId };
            }
            return c;
          }));
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to assign lead', 'error');
        }
      } else {
        // Create new lead from this chat and assign
        const newLead = {
          name: chat.name || chat.displayName || `WhatsApp ${phoneFromId}`,
          phone: phoneFromId,
          source: 'qr-whatsapp',
          status: 'lead',
          assignedToUserId: assignToUserId || undefined,
        };
        
        const res = await fetch('/api/admin/crm/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newLead)
        });
        
        if (res.ok) {
          const lead = await res.json();
          showToast(`Lead created and assigned!`, 'success');
          // Update the chat in state with new leadId
          setChats(prev => prev.map(c => {
            const cId = typeof c.id === 'string' ? c.id : c.id?._serialized;
            const targetId = typeof chat.id === 'string' ? chat.id : chat.id?._serialized;
            if (cId === targetId) {
              return { ...c, leadId: lead._id, assignedToUserId: assignToUserId };
            }
            return c;
          }));
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create lead', 'error');
        }
      }
    } catch (err) {
      console.error('Failed to assign chat:', err);
      showToast('Failed to assign', 'error');
    } finally {
      setAssigningChat(false);
      setShowAssignDropdown(null);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (!confirm('Clear this WhatsApp session (logout)?')) return;
      setDisconnecting(true);
      // **PERMANENT FIX**: Minimal bridge doesn't have /disconnect endpoint
      // Just clear local state instead
      setStatus('disconnected');
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      localStorage.removeItem(CHAT_CACHE_KEY);
      setBridgeError('Session cleared. Click "Connect" to scan QR again.');
    } catch (err) {
      console.debug('Failed to disconnect:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  // Force reset session - for "Try again later" errors
  const handleForceReset = async () => {
    if (forceResetting) return;
    
    if (!confirm('This will clear the WhatsApp session and attempt to force a fresh start. Continue?')) {
      return;
    }
    
    setForceResetting(true);
    setForceResetInstructions(null);
    setBridgeError(null);
    
    try {
      showToast('🔄 Resetting session...', 'info');
      
      const res = await fetch('/api/admin/crm/whatsapp/force-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      const data = await res.json();
      
      if (data.success && data.qr) {
        // Got a new QR code!
        setQr(data.qr);
        showToast('✅ Session reset! Scan the new QR code.', 'success');
        setForceResetInstructions(null);
      } else if (data.instructions) {
        // Show instructions to user
        setForceResetInstructions(data.instructions);
        showToast('⚠️ Manual steps required - see instructions below', 'warning');
      } else {
        setBridgeError(data.message || data.error || 'Reset failed');
      }
    } catch (err) {
      console.error('[ForceReset] Error:', err);
      setBridgeError(err instanceof Error ? err.message : 'Force reset failed');
    } finally {
      setForceResetting(false);
    }
  };

  const refreshQr = async () => {
    try {
      setBridgeError(null);
      console.log('[refreshQr] Fetching QR from fallback endpoint...');
      
      // Use fallback endpoint which handles retries, caching, and auto-restart
      const fallbackRes = await fetch('/api/admin/crm/whatsapp/qr-fallback', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store'
      });
      
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        console.log('[refreshQr] Fallback response:', { source: fallbackData.source, bridgeStatus: fallbackData.bridgeStatus });
        
        if (fallbackData.qr) {
          console.log('[refreshQr] QR found from', fallbackData.source);
          setQr(fallbackData.qr);
          setStatus('connected');
          setShowQRModal(true);
          
          if (fallbackData.warning) {
            setBridgeError(fallbackData.warning);
          }
          return;
        }
      }
      
      // If fallback also failed, show error
      const fallbackError = await fallbackRes.json();
      console.error('[refreshQr] Fallback failed:', fallbackError);
      setBridgeError(fallbackError.message || 'Unable to retrieve QR code. Please try again.');
      
      // QR is included directly in the /status response
      if (typeof data.qr === 'string' && data.qr.length > 0) {
        console.log('[refreshQr] QR found in status, setting it (length:', data.qr.length, ')');
        setQr(data.qr);
        setShowQRModal(true);
        return;
      } else {
        console.log('[refreshQr] QR not available in status response. hasQr:', data.hasQr, 'status:', data.status);
      }

      // Some bridge versions return qrPresent/qrLength instead of qr/hasQr
      const hasQrHint = Boolean(data?.qrPresent) || (Number(data?.qrLength || 0) > 0);

      // Some bridge versions only expose QR via /qr (status.hasQr=true but no status.qr).
      // Fall back to /qr to avoid leaving the UI stuck on “Generating QR…”.
      if (data.hasQr || hasQrHint || ['initializing', 'connecting', 'loading', 'qr'].includes(String(data.status || '').toLowerCase())) {
        try {
          console.log('[refreshQr] hasQr=true but no qr in status; fetching /qr...');
          const qrRes = await bridgeFetch('/qr', { method: 'GET' }, 8_000);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            if (typeof qrData?.qr === 'string' && qrData.qr.length > 0) {
              console.log('[refreshQr] QR found in /qr, setting it (length:', qrData.qr.length, ')');
              setQr(qrData.qr);
              setShowQRModal(true);
              return;
            }
          } else {
            console.warn('[refreshQr] /qr not ok:', qrRes.status);
          }
        } catch (e) {
          console.warn('[refreshQr] /qr fallback failed:', e);
        }
      }
      
      // Last resort: keep modal open with "Generating" message
      if (data.hasQr || hasQrHint) {
        console.log('[refreshQr] hasQr=true, showing modal with generating message');
        setShowQRModal(true);
        return;
      }
      
      setBridgeError('QR not available yet. Click Connect again, then retry.');
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Failed to refresh QR');
    }
  };

  // New number = start a fresh QR login flow (session may still be shared on the bridge).
  const handleNewNumber = async () => {
    try {
      setLoggingInNewNumber(true);
      setBridgeError(null);
      setQr(null);
      setSelectedChat(null);
      setMessages([]);
      setShowQRModal(true);

      const res = await bridgeFetch('/connect', { method: 'POST', body: '{}' }, 15_000);
      if (!res.ok) {
        setBridgeError(await parseBridgeError(res));
        return;
      }

      await refreshQr();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Failed to start new-number login');
    } finally {
      setLoggingInNewNumber(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Add new contact
  const handleAddNewContact = async () => {
    if (!newContactName.trim()) return;

    try {
      const trimmedName = newContactName.trim();
      
      // Create new contact object
      const newContact = {
        name: trimmedName,
        timestamp: new Date().toISOString(),
        unreadCount: 0,
        lastMessage: '',
      };

      // Add to chat list
      setChats(prev => [{
        id: `contact-${Date.now()}`,
        name: trimmedName,
        profilePicture: null,
        unreadCount: 0,
        lastMessage: null,
        timestamp: new Date().toISOString(),
      }, ...prev]);

      // Reset modal
      setShowNewContactModal(false);
      setNewContactName('');
    } catch (err) {
      console.error('Failed to add contact:', err);
      alert('Failed to add contact. Please try again.');
    }
  };

  // Add synthetic chat for testing
  const addSyntheticChat = (phone: string, name: string) => {
    const formatPhone = (phone: string) => {
      let p = phone.replace(/\D/g, '');
      if (!p.startsWith('91') && p.length === 10) {
        p = '91' + p;
      }
      return p + '@c.us';
    };

    const phoneId = formatPhone(phone);
    const syntheticChat = {
      id: { _serialized: phoneId },
      name: phone,
      displayName: name,
      isGroup: false,
      isReadOnly: false,
      unreadCount: 0,
      timestamp: null,
      archived: false,
    };

    setChats(prev => [syntheticChat, ...prev]);
  };

  const statusPill = {
    connected: 'bg-teal-500 text-white',
    qr: 'bg-orange-500 text-white',
    disconnected: 'bg-stone-200 text-stone-700',
    loading: 'bg-teal-600 text-white'
  }[status];

  const statusText = {
    connected: 'Connected',
    qr: 'Scan QR Code',
    disconnected: 'Disconnected',
    loading: 'Loading...'
  }[status];

  const handleClearOfflineCache = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CHAT_CACHE_KEY);
      localStorage.removeItem(CHAT_SELECTED_CACHE_KEY);

      // Remove message caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(MESSAGES_CACHE_KEY_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Also reset UI state
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      setBridgeError('Offline cache cleared. Please reconnect to reload chats.');
      setTimeout(() => setBridgeError(null), 2500);
    } catch (e) {
      console.warn('[cache] Failed to clear offline cache:', e);
      setBridgeError('Failed to clear cache.');
      setTimeout(() => setBridgeError(null), 2500);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAF8F5]">
      {/* Left Sidebar - Chats (Hidden on mobile, shown on larger screens) */}
      <div className="hidden md:flex md:w-80 bg-[#FAF8F5] border-r border-stone-200 flex-col">
        {/* Header */}
        <div className="bg-[#FAF8F5] border-b border-stone-200 p-3 space-y-3">
          {/* Top Row: Profile & Status on Left, Buttons on Right */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Profile & Status */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {userProfile?.profilePicture ? (
                <img
                  src={userProfile.profilePicture}
                  alt={userProfile.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8A645] to-[#0f3a4d] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(userProfile?.name || 'WhatsApp')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#0f3a4d] truncate">{userProfile?.name || 'WhatsApp'}</div>
                <div className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusPill}`}>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      status === 'connected'
                        ? 'bg-[#0f3a4d]'
                        : status === 'qr'
                          ? 'bg-[#E8A645] animate-pulse'
                          : status === 'loading'
                            ? 'bg-[#0f3a4d] animate-pulse'
                            : 'bg-[#F5EBE0]0'
                    }`}
                  />
                  {statusText}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* New Button - Add Contact */}
              <button
                onClick={() => setShowNewContactModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 text-white hover:bg-teal-600 transition-colors flex items-center gap-1"
                title="Add new contact"
              >
                <Plus size={16} />
                New
              </button>

              {/* Login Button - Green (when disconnected) */}
              {status !== 'connected' && (
                <button
                  onClick={handleConnect}
                  disabled={connecting || bridgeUnavailable}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60 transition-colors flex items-center gap-1"
                  title={bridgeUnavailable ? 'WhatsApp Bridge is unavailable' : 'Login with QR'}
                >
                  {connecting ? <RefreshCw className="animate-spin" size={16} /> : '↑'} {bridgeUnavailable ? 'Bridge Down' : 'Login'}
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {bridgeError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] leading-snug text-red-900">
              <div className="font-bold">⚠ Bridge issue</div>
              <div className="opacity-90 break-words">{bridgeError}</div>
              {status !== 'connected' && (
                <button
                  onClick={handleReconnect}
                  className="mt-2 w-full py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                >
                  Reconnect Now
                </button>
              )}
            </div>
          )}

          {/* Offline banner */}
          {isOffline && !bridgeError && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] leading-snug text-amber-900">
              <div className="font-bold">Offline mode</div>
              <div className="opacity-90">
                Showing last loaded chats/messages. Connect to refresh.
              </div>
              <button
                onClick={handleClearOfflineCache}
                className="mt-2 w-full py-1 bg-orange-500 text-white text-xs font-bold rounded hover:bg-orange-600"
              >
                Clear Offline Cache
              </button>
            </div>
          )}

          {/* Diagnostics banner (admin-only, show on error or when toggled) */}
          {(bridgeError || showDiagnostics) && isSuperAdmin && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[10px] leading-snug text-blue-900 font-mono">
              <div className="font-bold mb-1">🔧 Diagnostics (Super Admin)</div>
              <div className="space-y-0.5 opacity-90">
                <div>Bridge URL: <span className="opacity-70">{bridgeUrl}</span></div>
                <div>Last /status: <span className={lastStatusCode ? 'opacity-70' : 'text-red-700'}>{lastStatusCode || '—'}</span></div>
                <div>QR in response: <span className={lastStatusData?.qr ? 'opacity-70' : 'text-red-700'}>{lastStatusData?.qr ? `✓ (${lastStatusData.qr.length} chars)` : '✗ MISSING'}</span></div>
                <div>Status: <span className="opacity-70">{lastStatusData?.status || '—'}</span></div>
                <div>HasQr: <span className="opacity-70">{lastStatusData?.hasQr ? '✓' : '✗'}</span></div>
                <div>Secret set: <span className="opacity-70">{bridgeSecret ? '✓' : '✗'}</span></div>
                <div>Last /health: <span className={lastHealthCode ? 'opacity-70' : 'text-red-700'}>{lastHealthCode || '—'}</span></div>
                {lastHealthData && (
                  <>
                    <div>S3 configured: <span className="opacity-70">{lastHealthData?.s3Configured ? '✓' : '✗'}</span></div>
                    <div>S3 bucket: <span className="opacity-70">{lastHealthData?.s3Bucket || '—'}</span></div>
                    <div>Free disk bytes: <span className="opacity-70">{String(lastHealthData?.freeDiskBytes ?? '—')}</span></div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="mt-1 text-blue-600 hover:underline text-[9px]"
              >
                {showDiagnostics ? 'Hide' : 'Show'} details
              </button>
              {showDiagnostics && (
                <div className="mt-1 flex items-center gap-3">
                  <button
                    onClick={refreshBridgeHealth}
                    className="text-blue-600 hover:underline text-[9px]"
                  >
                    Refresh /health
                  </button>
                  <button
                    onClick={handleBridgeRestart}
                    className="text-blue-600 hover:underline text-[9px]"
                  >
                    Restart bridge
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs: Chats | Groups | Status */}
        <div className="flex border-b border-stone-200 bg-[#FAF8F5]">
          <button
            onClick={() => setSidebarTab('chats')}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              sidebarTab === 'chats' 
                ? 'text-teal-700 border-b-2 border-teal-500 bg-teal-50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            💬 Chats
          </button>
          <button
            onClick={() => setSidebarTab('groups')}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              sidebarTab === 'groups' 
                ? 'text-orange-700 border-b-2 border-orange-500 bg-orange-50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            👥 Groups
          </button>
          <button
            onClick={() => setSidebarTab('status')}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              sidebarTab === 'status' 
                ? 'text-teal-700 border-b-2 border-teal-500 bg-teal-50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            🔵 Status
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-100 bg-[#FAF8F5] space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={sidebarTab === 'groups' ? 'Search groups...' : 'Search or start a new chat'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/80 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
            {sidebarTab === 'groups' ? (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                title="Create new group"
                className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                <span className="text-xs hidden sm:inline">Group</span>
              </button>
            ) : (
              <button
                onClick={() => setShowNewLeadModal(true)}
                title="Add new lead"
                className="px-4 py-2 bg-teal-100 hover:bg-teal-200 text-teal-700 border border-teal-300 rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                <span className="text-xs hidden sm:inline">Lead</span>
              </button>
            )}
          </div>
        </div>

        {/* Content based on tab */}
        <div className="flex-1 overflow-y-auto">
          {/* Chats Tab */}
          {sidebarTab === 'chats' && (
            <>
              {chats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p className="text-sm">No conversations</p>
                </div>
              ) : (
            chats
              // Filter by search query
              .filter((chat) =>
                chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              // Permission filter: Non-super admins can only see assigned leads
              .filter((chat) => {
                // Super admins see all chats
                if (isSuperAdmin) return true;
                
                // If chat has a leadId, check if it's assigned to current user
                if (chat.leadId) {
                  return assignedLeadIds.has(String(chat.leadId));
                }
                
                // For chats without leadId (new contacts), allow viewing
                // but they won't be able to send messages (checked in send handler)
                return true;
              })
              // Sort: unread first, then by timestamp (newest first)
              .sort((a, b) => {
                // Unread messages first
                const aUnread = a.unreadCount && a.unreadCount > 0 ? 1 : 0;
                const bUnread = b.unreadCount && b.unreadCount > 0 ? 1 : 0;
                if (bUnread !== aUnread) return bUnread - aUnread;
                // Then by timestamp
                const aTime = a.timestamp || 0;
                const bTime = b.timestamp || 0;
                return bTime - aTime;
              })
              .map((chat) => (
                <div
                  key={typeof chat.id === 'string' ? chat.id : chat.id._serialized}
                  onClick={async () => {
                    setSelectedChat(chat);
                    // Extract phone number from chat id/name and set it for CRM message loading
                    const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
                    const phoneFromId = chatIdStr.split('@')[0].replace(/\D/g, '');
                    if (phoneFromId) setActivePhone(phoneFromId);
                    if (chat.leadId) {
                      setActiveLeadId(chat.leadId);
                      // Set leadNumber from chat object first (immediate)
                      if (chat.leadNumber) setActiveLeadNumber(chat.leadNumber);
                      // Then try to fetch full lead details (may update with fresher data)
                      try {
                        const res = await fetch(`/api/admin/crm/leads/${chat.leadId}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                          const lead = await res.json();
                          if (lead.leadNumber) setActiveLeadNumber(lead.leadNumber);
                          if (lead.status) setActiveStatus(lead.status?.toUpperCase());
                          if (lead.labels?.[0]) setActiveLabel(lead.labels[0]);
                          if (lead.name) setActiveName(lead.name);
                        }
                      } catch (e) { console.warn('Failed to fetch lead:', e); }
                    } else {
                      // Clear ALL lead-specific state for non-lead chats (CRITICAL: include leadId!)
                      setActiveLeadId(null);
                      setActiveLeadNumber(null);
                      setActiveStatus(null);
                      setActiveLabel(null);
                    }
                    if (chat.displayName || chat.name) setActiveName(chat.displayName || chat.name);
                    markChatAsRead(chat);
                  }}
                  className={`p-4 border-b border-stone-100 cursor-pointer transition-all ${
                    selectedChat &&
                    (typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized) ===
                      (typeof chat.id === 'string' ? chat.id : chat.id._serialized)
                      ? 'bg-teal-50 border-l-4 border-l-teal-500'
                      : 'hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Unread Indicator Badge */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {chat.isGroup ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                          👥
                        </div>
                      ) : chat.profilePicture ? (
                        <img
                          src={chat.profilePicture}
                          alt={chat.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
                          {getInitials(chat.name || 'U')}
                        </div>
                      )}
                      
                      {/* Unread Indicator Badge - Red for unread, Blue for read */}
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-white text-[10px] font-bold">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </span>
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Name + Date + Assign on same line */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-stone-800 truncate text-sm">
                          {chat.displayName || chat.name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-1">
                          {/* Assign Icon (only for super admin / mr admin) */}
                          {isSuperAdmin && !chat.isGroup && (
                            <div className="relative" data-assign-dropdown>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const chatKey = typeof chat.id === 'string' ? chat.id : chat.id?._serialized;
                                  setShowAssignDropdown(showAssignDropdown === chatKey ? null : chatKey);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-purple-600 transition-colors"
                                title="Assign to user"
                              >
                                <UserPlus size={14} />
                              </button>
                              {/* Assign Dropdown */}
                              {showAssignDropdown === (typeof chat.id === 'string' ? chat.id : chat.id?._serialized) && (
                                <div className="absolute right-0 top-6 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50" data-assign-dropdown>
                                  <div className="p-2 border-b border-slate-100 text-xs font-bold text-slate-600">
                                    Assign to:
                                  </div>
                                  <div className="max-h-40 overflow-y-auto">
                                    {userOptions.length === 0 ? (
                                      <div className="p-2 text-xs text-slate-400">No users found</div>
                                    ) : (
                                      userOptions.map((user) => (
                                        <button
                                          key={user.userId}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAssignChat(chat, user.userId);
                                          }}
                                          disabled={assigningChat}
                                          className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50"
                                        >
                                          <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                          </span>
                                          <span className="truncate">{user.name || user.email}</span>
                                          {chat.assignedToUserId === user.userId && (
                                            <CheckCircle size={12} className="text-green-500 ml-auto" />
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignChat(chat, '');
                                    }}
                                    disabled={assigningChat}
                                    className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 border-t border-slate-100 disabled:opacity-50"
                                  >
                                    ✕ Unassign
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Today's Date */}
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date().toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Phone number - always show below name */}
                      <p className="text-[11px] text-[#0f3a4d]/60 truncate">
                        📱 {(() => {
                          // Extract phone from chat id or name
                          const chatIdStr = typeof chat.id === 'string' ? chat.id : chat.id?._serialized || '';
                          const phoneFromId = chatIdStr.split('@')[0].replace(/\D/g, '');
                          const phoneFromName = String(chat.name || '').replace(/\D/g, '');
                          return phoneFromId || phoneFromName || chat.name || 'No number';
                        })()}
                      </p>
                      
                      {/* WhatsApp JID - show full ID */}
                      <p className="text-[9px] text-purple-600/70 font-mono truncate" title="WhatsApp JID">
                        🆔 {typeof chat.id === 'string' ? chat.id : chat.id?._serialized || 'N/A'}
                      </p>
                      
                      {/* Last Seen indicator */}
                      {chat.timestamp && (
                        <p className="text-[9px] text-green-600/70 truncate">
                          🕐 Last seen: {(() => {
                            const ts = chat.timestamp * 1000;
                            const date = new Date(ts);
                            const now = new Date();
                            const diffMs = now.getTime() - date.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);
                            
                            if (diffMins < 1) return 'Just now';
                            if (diffMins < 60) return `${diffMins}m ago`;
                            if (diffHours < 24) return `${diffHours}h ago`;
                            if (diffDays < 7) return `${diffDays}d ago`;
                            return date.toLocaleDateString();
                          })()}
                        </p>
                      )}
                      
                      {/* Lead Details Tags: ID, Status, Label, Assigned - third line */}
                      {(chat.leadId || chat.leadStatus || chat.leadLabel || chat.assignedToUserId) && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {/* ID Tag */}
                          {chat.leadId && (
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[9px] font-bold rounded border border-pink-300 whitespace-nowrap">
                              ID: {chat.leadNumber || chat.leadId.toString().slice(-6)}
                            </span>
                          )}
                          
                          {/* Assigned To Tag */}
                          {chat.assignedToUserId && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded border border-purple-300 whitespace-nowrap">
                              👤 {userOptions.find(u => u.userId === chat.assignedToUserId)?.name?.split(' ')[0] || 'Assigned'}
                            </span>
                          )}
                          
                          {/* Status Tag */}
                          {chat.leadStatus && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap ${
                              chat.leadStatus?.toUpperCase() === 'LEAD' ? 'bg-green-100 text-green-700 border-green-300' :
                              chat.leadStatus?.toUpperCase() === 'PROSPECT' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              chat.leadStatus?.toUpperCase() === 'CUSTOMER' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                              chat.leadStatus?.toUpperCase() === 'INACTIVE' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                              'bg-[#F5EBE0]/60 text-[#0f3a4d] border-[#E8DFD5]'
                            }`}>
                              {String(chat.leadStatus).charAt(0).toUpperCase() + String(chat.leadStatus).slice(1).toLowerCase()}
                            </span>
                          )}
                          
                          {/* Label Tag */}
                          {chat.leadLabel ? (
                            <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[9px] font-bold rounded border border-cyan-300 whitespace-nowrap">
                              {chat.leadLabel}
                            </span>
                          ) : (
                            chat.leadStatus && (
                              <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[9px] font-bold rounded border border-cyan-300 whitespace-nowrap">
                                NO LABEL
                              </span>
                            )
                          )}
                        </div>
                      )}
                      
                      {/* Bottom line: Show last message or other info if no lead details */}
                      {!(chat.leadId || chat.leadStatus || chat.leadLabel || chat.assignedToUserId) && (
                        <p className="text-[11px] text-[#0f3a4d]/60 truncate">
                          {chat.isGroup && chat.memberCount ? (
                            `Group · ${chat.memberCount} members`
                          ) : (
                            chat.lastMessage?.body || 'No messages'
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
              )}
            </>
          )}

          {/* Groups Tab */}
          {sidebarTab === 'groups' && (
            <>
              {loadingGroups ? (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <RefreshCw className="animate-spin" size={20} />
                  <span className="ml-2 text-sm">Loading groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 p-4">
                  <p className="text-sm">No groups found</p>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200"
                  >
                    Create New Group
                  </button>
                </div>
              ) : (
                groups
                  .filter((group) =>
                    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((group) => (
                    <div
                      key={group.id}
                      onClick={() => {
                        setSelectedChat({ ...group, isGroup: true });
                        setActivePhone(null);
                        setActiveLeadId(null);
                        setActiveName(group.name);
                      }}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-all ${
                        selectedChat?.id === group.id
                          ? 'bg-purple-50 border-l-4 border-l-purple-500'
                          : 'hover:bg-[#F5EBE0]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          {group.profilePicUrl ? (
                            <img
                              src={group.profilePicUrl}
                              alt={group.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                              👥
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[8px] font-bold rounded-full px-1">
                            {group.memberCount || '?'}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0f3a4d] truncate text-sm">
                            {group.name || 'Unnamed Group'}
                          </p>
                          <p className="text-[9px] text-purple-600/70 font-mono truncate" title="Group JID">
                            🆔 {group.id}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {group.memberCount} members
                          </p>
                          {group.lastMessage && (
                            <p className="text-[11px] text-slate-400 truncate mt-1">
                              {group.lastMessage.body || 'No messages'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </>
          )}

          {/* Status Tab */}
          {sidebarTab === 'status' && (
            <div className="p-4 text-center text-slate-400">
              <div className="text-4xl mb-3">🔵</div>
              <p className="text-sm font-medium mb-2">WhatsApp Status</p>
              <p className="text-xs text-slate-400 mb-4">
                Status viewing is limited in WhatsApp Web API.
                Use your phone to view and post status updates.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-bold">💡 Tip</p>
                <p>Open WhatsApp on your phone to:</p>
                <ul className="mt-1 text-left list-disc list-inside">
                  <li>View friends' status updates</li>
                  <li>Post your own status</li>
                  <li>React to status updates</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Messages */}
      <div className="flex-1 flex flex-col bg-[#FAF8F5]">
        {/* Top Header - Before Chat Area */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xs">Swar Yoga</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Home Button - Orange */}
            <button
              onClick={() => {
                window.location.href = '/admin/crm';
              }}
              className="px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center gap-1"
              title="Go to CRM Dashboard"
            >
              <span>🏠</span> Home
            </button>

            {/* QR Button - White/Teal */}
            <button
              onClick={handleNewNumber}
              disabled={loggingInNewNumber || disconnecting || connecting}
              className="px-2 py-1 rounded text-xs font-bold bg-white text-teal-700 hover:bg-teal-50 disabled:opacity-60 transition-colors flex items-center gap-1"
              title="Scan new QR code"
            >
              <span>{loggingInNewNumber ? '⟳' : '📱'}</span> QR
            </button>

            {/* Logout Button - Red */}
            {status === 'connected' && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-2 py-1 rounded text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center gap-1"
                title="Logout"
              >
                <span>{disconnecting ? '⟳' : '→'}</span> Logout
              </button>
            )}
          </div>
        </div>

        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-stone-200 p-3 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {selectedChat.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    👥
                  </div>
                ) : selectedChat.profilePicture ? (
                  <img
                    src={selectedChat.profilePicture}
                    alt={selectedChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(selectedChat.name || 'U')}
                  </div>
                )}
                <div className="flex-1 cursor-pointer" onClick={() => {
                  if (selectedChat.isGroup) {
                    loadGroupDetails(selectedChat.id);
                  } else {
                    loadContactDetails(selectedChat.id);
                  }
                }}>
                  {/* Name (top line) */}
                  <h2 className="text-sm font-bold text-stone-800 truncate hover:text-teal-600 transition-colors">
                    {activeName || selectedChat.name}
                  </h2>
                  
                  {/* Phone Number (subtitle) */}
                  {activePhone && (
                    <p className="text-[11px] text-stone-500 truncate">
                      📱 {activePhone}
                    </p>
                  )}
                  
                  {/* WhatsApp JID & Last Seen Row */}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {/* WhatsApp JID */}
                    <span className="text-[9px] text-purple-600/80 font-mono" title="WhatsApp JID">
                      🆔 {typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id?._serialized || 'N/A'}
                    </span>
                    
                    {/* Last Seen */}
                    {selectedChat.timestamp && (
                      <span className="text-[9px] text-green-600/80">
                        🕐 {(() => {
                          const ts = selectedChat.timestamp * 1000;
                          const date = new Date(ts);
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMs / 3600000);
                          const diffDays = Math.floor(diffMs / 86400000);
                          
                          if (diffMins < 1) return 'Online';
                          if (diffMins < 60) return `${diffMins}m ago`;
                          if (diffHours < 24) return `${diffHours}h ago`;
                          if (diffDays < 7) return `${diffDays}d ago`;
                          return date.toLocaleDateString();
                        })()}
                      </span>
                    )}
                  </div>
                  
                  {/* Compact Lead Tags */}
                  {activeLeadId && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[9px] font-bold rounded">
                        #{activeLeadNumber || activeLeadId.slice(-6)}
                      </span>
                      {activeStatus && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                          activeStatus === 'LEAD' ? 'bg-green-100 text-green-700' :
                          activeStatus === 'PROSPECT' ? 'bg-blue-100 text-blue-700' :
                          activeStatus === 'CUSTOMER' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {activeStatus}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Group info */}
                  {!activeLeadId && selectedChat.isGroup && selectedChat.memberCount && (
                    <p className="text-[11px] text-[#0f3a4d]/60 mt-1">
                      Group · {selectedChat.memberCount} members
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Sidebar Toggle + Close Button */}
              <div className="flex items-center gap-2">
                {/* Toggle Sidebar Button */}
                <button
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className="hidden lg:flex px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors items-center gap-1"
                  title={showRightSidebar ? 'Hide details' : 'Show details'}
                >
                  <span>📋</span> {showRightSidebar ? 'Hide' : 'Details'}
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-[#0f3a4d]/60 hover:text-[#0f3a4d] text-2xl leading-none"
                  aria-label="Close chat"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cec4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>No messages yet</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    // Render professional tick marks like WhatsApp
                    const renderAckStatus = (ack: number) => {
                      if (ack === 0) return null; // No status for unsent
                      if (ack === 1) return '✓';  // Single tick
                      if (ack === 2) return '✓✓'; // Double tick
                      if (ack === 3) return '✓✓'; // Blue tick (same visual, we'll color it blue)
                    };

                    const ackColor = msg.ack === 3 ? 'text-blue-500' : 'text-[#0f3a4d]/60';
                    const ackDisplay = renderAckStatus(msg.ack);

                    // Format message timestamp
                    const formatTime = (ts: number | Date | string | undefined) => {
                      if (!ts) return '';
                      const date = typeof ts === 'number' ? new Date(ts * (ts < 1e12 ? 1000 : 1)) : new Date(ts);
                      if (isNaN(date.getTime())) return '';
                      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    };
                    const messageTime = formatTime(msg.timestamp || msg.sentAt);

                    // Media handling:
                    // - Bridge message list provides `hasMedia` but not the bytes/URL.
                    // - We lazily fetch base64 via `/messages/media/:msgId` and cache it.
                    // - CRM messages have media.url, optimistic messages have mediaUrl
                    const msgId = String(msg?.id || '');
                    const cachedMedia = msgId ? messageMediaCache[msgId] : undefined;
                    const rawMediaUrl = msg.mediaUrl || msg.media?.url || cachedMedia?.dataUrl;
                    // Proxy S3 URLs through our API to handle Block Public Access
                    const resolvedMediaUrl = getProxiedMediaUrl(rawMediaUrl, token);
                    const mediaMime = String(msg.mimeType || msg.mimetype || cachedMedia?.mimetype || '');
                    const wantsMediaLoad = Boolean(msg.hasMedia) && !rawMediaUrl;

                    // Use rawMediaUrl for extension detection (proxied URL has query params)
                    const isImage = Boolean(
                      rawMediaUrl &&
                        (mediaMime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(rawMediaUrl))
                    );
                    const isVideo = Boolean(
                      rawMediaUrl &&
                        (mediaMime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(rawMediaUrl))
                    );
                    const isPDF = Boolean(
                      rawMediaUrl &&
                        (mediaMime === 'application/pdf' || /\.pdf$/i.test(rawMediaUrl))
                    );

                    // Format WhatsApp-style text: *bold*, _italic_, ~strikethrough~
                    const formatWhatsAppText = (text: string): React.ReactNode[] => {
                      return text.split('\n').map((line, lineIdx) => {
                        const parts: React.ReactNode[] = [];
                        const regex = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)/g;
                        let lastIndex = 0;
                        let match;
                        let keyIdx = 0;
                        
                        while ((match = regex.exec(line)) !== null) {
                          if (match.index > lastIndex) {
                            parts.push(line.slice(lastIndex, match.index));
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
                        if (lastIndex < line.length) {
                          parts.push(line.slice(lastIndex));
                        }
                        return (
                          <React.Fragment key={lineIdx}>
                            {parts.length > 0 ? parts : line}
                            {lineIdx < text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        );
                      });
                    };

                    return (
                      <div key={idx} className={`flex flex-col gap-1 ${msg.fromMe ? 'items-end' : 'items-start'}`}>
                        {/* Message Bubble */}
                        <div className={`flex gap-2 ${msg.fromMe ? 'justify-end' : 'justify-start'} w-full`}>
                          <div
                            className={`inline-block max-w-[75%] rounded-xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${
                              msg.fromMe
                                ? 'bg-teal-50 text-stone-800 rounded-tr-sm border border-teal-200 ml-auto'
                                : 'bg-teal-600 text-white rounded-tl-sm mr-auto'
                            }`}
                            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                          >
                            {/* Media Content - Using unified InlineMediaPreview */}
                            {wantsMediaLoad ? (
                              <div className="space-y-2">
                                <div className={`text-sm ${msg.fromMe ? 'text-stone-600' : 'text-white/80'}`}>📎 Media message</div>
                                <button
                                  onClick={() => loadMediaForMessage(msg, { force: true })}
                                  className={`px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60 ${msg.fromMe ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-300' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                  disabled={Boolean(messageMediaLoading[msgId])}
                                >
                                  {messageMediaLoading[msgId] ? 'Loading…' : 'Load media'}
                                </button>
                              </div>
                            ) : resolvedMediaUrl ? (
                              <div className="space-y-2">
                                <div className="-mx-4 -mt-2.5">
                                  <InlineMediaPreview 
                                    url={resolvedMediaUrl}
                                    type={isImage ? 'image' : isVideo ? 'video' : 'document'}
                                    className="rounded-t-xl rounded-b-none w-full"
                                  />
                                </div>
                                {msg.body && msg.body.trim() && (() => {
                                  // Extract [admincrm] or similar tags and show below message
                                  const tagMatch = msg.body.match(/\s*\[(admincrm|admin|crm)\]\s*$/i);
                                  const mainBody = tagMatch ? msg.body.replace(tagMatch[0], '').trim() : msg.body;
                                  const tag = tagMatch ? tagMatch[1] : null;
                                  return (
                                    <div className="space-y-1">
                                      {mainBody && <div className="leading-relaxed">{formatWhatsAppText(mainBody)}</div>}
                                      {tag && <div className="text-[10px] opacity-60 italic">via {tag}</div>}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              (() => {
                                // Extract [admincrm] or similar tags and show below message
                                const tagMatch = msg.body?.match(/\s*\[(admincrm|admin|crm)\]\s*$/i);
                                const mainBody = tagMatch ? msg.body.replace(tagMatch[0], '').trim() : (msg.body || '');
                                const tag = tagMatch ? tagMatch[1] : null;
                                
                                return (
                                  <div className="space-y-1">
                                    {mainBody && <div className="leading-relaxed">{formatWhatsAppText(mainBody)}</div>}
                                    {tag && <div className="text-[10px] opacity-60 italic">via {tag}</div>}
                                  </div>
                                );
                              })()
                            )}

                            {/* Time and status row */}
                            <div className={`text-[10px] mt-2 flex items-center gap-1.5 ${msg.fromMe ? 'justify-end text-stone-500' : 'justify-start text-white/70'}`}>
                              {/* Show sender name for outbound messages */}
                              {msg.fromMe && (msg.sentByLabel || msg.senderDisplayName) && (
                                <span className="font-medium text-teal-600">{msg.sentByLabel || msg.senderDisplayName}</span>
                              )}
                              {msg.fromMe && (msg.sentByLabel || msg.senderDisplayName) && <span className="opacity-50">•</span>}
                              {messageTime && <span className="tracking-wide">{messageTime}</span>}
                              {msg.fromMe && ackDisplay && (
                                <span className={`font-medium ${ackColor}`}>{ackDisplay}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input Area */}
            <div className="border-t border-[#E8DFD5] bg-[#FAFAF8]/50 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-3 py-1 border-b border-slate-100 bg-[#FAFAF8]/80">
                <button
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 relative ${
                    showMediaMenu ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5EBE0]/60 text-[#0f3a4d]/60'
                  }`}
                  title="Attach media"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showQuickReplies ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5EBE0]/60 text-[#0f3a4d]/60'
                  }`}
                  title="Quick replies"
                >
                  <Zap size={18} />
                </button>

                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showTemplates ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5EBE0]/60 text-[#0f3a4d]/60'
                  }`}
                  title="Message templates"
                >
                  <FileText size={18} />
                </button>

                <button
                  onClick={() => setShowSchedulePanel(!showSchedulePanel)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showSchedulePanel ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5EBE0]/60 text-[#0f3a4d]/60'
                  }`}
                  title="Schedule or delay message"
                >
                  <Clock size={18} />
                </button>

                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showEmojiPicker ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5EBE0]/60 text-[#0f3a4d]/60'
                  }`}
                  title="Emoji picker"
                >
                  <Smile size={18} />
                </button>

                {/* Media Dropdown Menu */}
                {showMediaMenu && (
                  <div className="absolute bottom-28 left-4 bg-[#FAFAF8] rounded-xl shadow-2xl border border-[#E8DFD5] min-w-[200px] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#0f3a4d] hover:bg-[#F5EBE0] transition-colors border-b border-slate-50"
                    >
                      <ImageIcon className="text-emerald-500" size={18} />
                      Photos & Videos
                    </button>
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#0f3a4d] hover:bg-[#F5EBE0] transition-colors border-b border-slate-50"
                    >
                      <FileIcon className="text-blue-500" size={18} />
                      Document
                    </button>
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#0f3a4d] hover:bg-[#F5EBE0] transition-colors"
                    >
                      <Mic className="text-orange-500" size={18} />
                      Audio
                    </button>
                  </div>
                )}
              </div>

              {/* Templates Panel */}
              {showTemplates && (
                <div className="absolute bottom-20 left-0 right-0 mx-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <TemplateSelector
                    token={token}
                    onSelect={(template: WhatsAppTemplate) => {
                      // Clean template content - remove [QUICK_REPLY] markers
                      const cleanContent = (template.templateContent || '')
                        .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
                        .replace(/\[QUICK_REPLY\][^\n]*/gi, '')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();
                      setNewMessage(cleanContent);
                      
                      // Store the full template for sending via Meta
                      setSelectedTemplate(template);
                      
                      // Set template media if available
                      const mediaUrl = template.headerMedia?.url || template.imageFile?.url || null;
                      if (mediaUrl) {
                        setTemplateMediaUrl(mediaUrl);
                        // Clear any pending file uploads since we're using template image
                        setPendingMedia([]);
                        setMediaPreviews([]);
                      } else {
                        setTemplateMediaUrl(null);
                      }
                      
                      setShowTemplates(false);
                    }}
                    onClose={() => setShowTemplates(false)}
                    showSearch={true}
                    showFilters={true}
                    showPreview={true}
                    mode="inline"
                    maxHeight="350px"
                    className="shadow-2xl border border-[#E8DFD5] rounded-xl"
                  />
                </div>
              )}

              {/* Quick Replies Panel */}
              {showQuickReplies && (
                <div className="absolute bottom-20 left-0 right-0 mx-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-white rounded-xl shadow-2xl border border-[#E8DFD5] overflow-hidden max-h-[300px]">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">⚡ Quick Replies</h3>
                      <button
                        onClick={() => setShowQuickReplies(false)}
                        className="p-1 rounded-lg hover:bg-gray-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => insertQuickReply(qr.message)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F5EBE0] text-sm text-gray-700 transition-colors"
                        >
                          {qr.message}
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-200 flex gap-2">
                      <input
                        type="text"
                        value={newQuickReply}
                        onChange={(e) => setNewQuickReply(e.target.value)}
                        placeholder="Add new quick reply..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A884]/20 focus:border-[#00A884] outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newQuickReply.trim()) {
                            setQuickReplies([...quickReplies, { id: String(Date.now()), message: newQuickReply }]);
                            setNewQuickReply('');
                          }
                        }}
                        className="px-3 py-2 bg-[#00A884] text-white rounded-lg font-semibold text-sm hover:bg-[#008f6f] transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={mediaInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,audio/*"
                onChange={handleMediaUpload}
                className="hidden"
              />

              {/* Media Preview Bar */}
              {(mediaPreviews.length > 0 || templateMediaUrl) && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-[#F5EBE0] border-t border-[#E8DFD5]">
                  {/* Template Media Preview */}
                  {templateMediaUrl && (
                    <div className="relative flex-shrink-0">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                        <img 
                          src={templateMediaUrl} 
                          alt="Template" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setTemplateMediaUrl(null);
                            setSelectedTemplate(null);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] text-center py-0.5 font-medium">
                          {selectedTemplate ? '📤 Meta' : 'Image'}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Pending Media Previews */}
                  {mediaPreviews.map((preview, idx) => {
                    const file = pendingMedia[idx];
                    const isImage = file?.type.startsWith('image/');
                    const isVideo = file?.type.startsWith('video/');
                    const isAudio = file?.type.startsWith('audio/');
                    const mediaType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';
                    
                    return (
                      <div key={idx} className="relative flex-shrink-0">
                        <MediaPreview 
                          media={{
                            url: preview,
                            type: mediaType,
                            name: pendingMedia[idx]?.name
                          }}
                          size="sm"
                          showDownload={false}
                          showExpand={false}
                          onRemove={() => removePendingMedia(idx)}
                        />
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => mediaInputRef.current?.click()}
                    className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E8DFD5] text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Add</span>
                  </button>
                </div>
              )}

              {/* Main Input Field */}
              <div className="flex items-end gap-2 px-3 py-2.5">
                <textarea
                  value={newMessage}
                  spellCheck="true"
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  lang="en"
                  data-gramm="true"
                  data-gramm_editor="true"
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onContextMenu={(e) => handleSpellCheck(e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((newMessage.trim() || pendingMedia.length > 0 || templateMediaUrl) && !sending && status === 'connected') {
                        handleScheduledSend();
                      }
                    }
                  }}
                  placeholder={(pendingMedia.length > 0 || templateMediaUrl) ? "Add a caption..." : "Type a message... (misspelled words will show red underline)"}
                  className="flex-1 w-full px-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 resize-none min-h-[44px] max-h-[200px] leading-relaxed transition-all shadow-sm"
                  style={{ 
                    WebkitTextDecorationStyle: 'wavy',
                    textDecorationColor: 'red',
                  }}
                  rows={1}
                />

                <button
                  onClick={handleScheduledSend}
                  disabled={sending || (!newMessage.trim() && pendingMedia.length === 0 && !templateMediaUrl) || status !== 'connected' || uploadingMedia}
                  className="flex-shrink-0 w-11 h-11 rounded-full bg-teal-500 hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white shadow-sm transition-all flex items-center justify-center hover:scale-105 active:scale-95"
                >
                  {sending || uploadingMedia ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send size={20} className="ml-0.5" />
                  )}
                </button>
              </div>

              {/* Status/Progress Area (Nested) */}
              {(uploadingMedia || showEmojiPicker) && (
                <div className="px-4 pb-2">
                  {/* Upload Progress */}
                  {uploadingMedia && Object.keys(uploadProgress).length > 0 && (
                    <div className="space-y-1 py-2 border-t border-slate-100">
                      {Object.entries(uploadProgress).map(([fileId, progress]) => (
                        <div key={fileId} className="text-[10px] text-[#0f3a4d]/60">
                          <div className="flex justify-between mb-1">
                            <span className="truncate max-w-[150px]">{fileId.split('-')[0]}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-[#F5EBE0]/60 rounded-full h-1">
                            <div className="bg-[#F5EBE0]0 h-1 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Emoji Picker Grid */}
                  {showEmojiPicker && (
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-[#FAFAF8] p-2 rounded-xl border border-[#E8DFD5] max-h-40 overflow-y-auto shadow-inner my-1 animate-in zoom-in-95 duration-200">
                      {['😊', '😂', '🥰', '😍', '🎉', '🎊', '🔥', '👍', '❤️', '😢', '😡', '🤔', '👏', '🙌', '💪', '🚀', '⭐', '✨', '💯', '🎈', '🎁', '🌟', '💝', '😎', '🤗', '😘', '😌', '😴', '😷', '�', '�', '�', '🙌', '�'].map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                          className="p-1.5 hover:bg-[#F5EBE0]/60 rounded text-xl transition-colors hover:scale-125 duration-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0f3a4d] mb-2">WhatsApp Web</div>
              <p className="text-sm text-[#0f3a4d]/70">
                {status === 'connected'
                  ? 'Select a chat on the left to start messaging.'
                  : 'Click “Login (QR)” to connect, then scan the QR with your phone.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - CRM Details Panel */}
      {showRightSidebar && selectedChat && (
        <aside className="hidden lg:flex w-72 border-l border-slate-200/70 flex-col overflow-y-auto bg-white shrink-0">
          {/* User Info Header */}
          <div className="p-4 border-b border-slate-200/70 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                {activeName ? activeName[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 leading-tight truncate">{activeName || 'Unknown'}</h3>
                <p className="text-xs text-slate-500 truncate">📱 {activePhone || 'No number'}</p>
              </div>
            </div>
            
            {/* Online/Connection Status */}
            <div className="flex items-center gap-2 text-xs">
              {status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Bridge Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Bridge Offline
                </span>
              )}
            </div>
          </div>

          {/* CRM Details Section */}
          {activeLeadId ? (
            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              {/* Lead ID Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-lg border border-pink-200">
                  Lead ID: {activeLeadNumber || 'N/A'}
                </span>
              </div>

              {/* Status Dropdown */}
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none bg-slate-50 font-semibold text-green-700"
                  value={sidebarData.status}
                  onChange={(e) => setSidebarData({ ...sidebarData, status: e.target.value })}
                >
                  <option value="">Select status...</option>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </section>

              {/* Labels Dropdown */}
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Labels</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-slate-50"
                  value={sidebarData.labels[0] || ''}
                  onChange={(e) => setSidebarData({ ...sidebarData, labels: e.target.value ? [e.target.value] : [] })}
                >
                  <option value="">Select label...</option>
                  {labelOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </section>

              {/* Internal Notes */}
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Internal Notes</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none min-h-[100px] bg-slate-50 placeholder:text-slate-400 resize-none"
                  placeholder="Add notes about this customer..."
                  value={sidebarData.notes}
                  onChange={(e) => setSidebarData({ ...sidebarData, notes: e.target.value })}
                />
              </section>

              {/* Follow Up Date */}
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Next Follow-up</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📅</span>
                  <input 
                    type="date"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-slate-50" 
                    value={sidebarData.followUpDate}
                    onChange={(e) => setSidebarData({ ...sidebarData, followUpDate: e.target.value })}
                  />
                </div>
              </section>

              {/* Save Button */}
              <button 
                onClick={handleSaveSidebar}
                disabled={savingSidebar}
                className="w-full bg-green-600 text-white flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingSidebar ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>💾</span>
                )}
                <span>Save Changes</span>
              </button>
            </div>
          ) : (
            /* No Lead - Show Create Lead Option */
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">No lead record found for this contact</p>
              <button 
                onClick={() => {
                  if (activePhone) {
                    setNewLeadForm({
                      ...newLeadForm,
                      phone: activePhone,
                      name: activeName || '',
                    });
                    setShowNewLeadModal(true);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
              >
                + Create Lead
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Sidebar Toggle Button (when hidden on desktop) */}
      {!showRightSidebar && selectedChat && (
        <button
          onClick={() => setShowRightSidebar(true)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-green-600 text-white rounded-l-lg items-center justify-center shadow-lg hover:bg-green-700 transition-colors z-30"
          title="Show details panel"
        >
          <span className="text-lg">◀</span>
        </button>
      )}

      {/* Contact Details Side Panel */}
      {showContactPanel && contactDetails && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#FAFAF8] border-l border-[#E8DFD5] shadow-lg z-40 flex flex-col">
          {/* Header */}
          <div className="border-b border-[#E8DFD5] p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0f3a4d]">Contact Details</h3>
            <button
              onClick={() => setShowContactPanel(false)}
              className="text-[#0f3a4d]/60 hover:text-[#0f3a4d] text-2xl leading-none"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contact Info */}
          <div className="flex-1 overflow-y-auto">
            {/* Profile Section */}
            <div className="p-4 border-b border-slate-100 flex flex-col items-center gap-3">
              {contactDetails.profilePicture ? (
                <img
                  src={contactDetails.profilePicture}
                  alt={contactDetails.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                  👤
                </div>
              )}
              <div className="text-center">
                <h2 className="text-lg font-bold text-[#0f3a4d]">{contactDetails.name}</h2>
                <p className="text-sm text-[#0f3a4d]/60">{contactDetails.number}</p>
              </div>
            </div>

            {/* Status & Stats */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#0f3a4d]/70">Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-[#0f3a4d]">Online</span>
                </span>
              </div>
              {contactDetails.lastSeen && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0f3a4d]/70">Last Seen</span>
                  <span className="text-sm font-medium text-[#0f3a4d]">
                    {new Date(contactDetails.lastSeen * 1000).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#0f3a4d]/70">Messages</span>
                <span className="text-sm font-medium text-[#0f3a4d]">{contactDetails.unreadCount || 0} unread</span>
              </div>
            </div>

            {/* Last Message */}
            {contactDetails.lastMessage && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs text-[#0f3a4d]/70 mb-2 font-semibold">LAST MESSAGE</p>
                <div className="bg-[#F5EBE0] p-3 rounded-lg border border-[#E8DFD5]">
                  <p className="text-sm text-[#0f3a4d] break-words">{contactDetails.lastMessage.body}</p>
                  <p className="text-xs text-[#0f3a4d]/60 mt-1">
                    {new Date(contactDetails.lastMessage.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F5EBE0]/60 hover:bg-[#E8DFD5] text-[#0f3a4d] font-medium transition-colors text-sm">
                📞 Call
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F5EBE0]/60 hover:bg-[#E8DFD5] text-[#0f3a4d] font-medium transition-colors text-sm">
                🔔 Mute Notifications
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 font-medium transition-colors text-sm">
                🚫 Block Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Side Panel */}
      {showGroupPanel && groupDetails && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#FAFAF8] border-l border-[#E8DFD5] shadow-lg z-40 flex flex-col">
          {/* Header */}
          <div className="border-b border-[#E8DFD5] p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0f3a4d]">Group Settings</h3>
            <button
              onClick={() => setShowGroupPanel(false)}
              className="text-[#0f3a4d]/60 hover:text-[#0f3a4d] text-2xl leading-none"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Group Info */}
          <div className="flex-1 overflow-y-auto">
            {/* Profile Section */}
            <div className="p-4 border-b border-slate-100 flex flex-col items-center gap-3">
              {groupDetails.profilePicUrl ? (
                <img
                  src={groupDetails.profilePicUrl}
                  alt={groupDetails.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-3xl">
                  👥
                </div>
              )}
              <div className="text-center w-full">
                {isEditingGroupName ? (
                  <div className="flex flex-col gap-2 px-4">
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-[#0f3a4d] font-medium"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Group Name"
                      disabled={isUpdatingGroup}
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => updateGroupSettings({ subject: editGroupName })}
                        disabled={isUpdatingGroup}
                        className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isUpdatingGroup ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingGroupName(false);
                          setEditGroupName(groupDetails.name);
                        }}
                        className="px-3 py-1 bg-[#E8DFD5] text-[#0f3a4d] text-xs font-bold rounded hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative px-4">
                    <h2 className="text-lg font-bold text-[#0f3a4d] pr-6">{groupDetails.name}</h2>
                    <button
                      onClick={() => setIsEditingGroupName(true)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-600 transition-opacity"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <p className="text-sm text-[#0f3a4d]/60">
                      {groupDetails.participants?.length || 0} participants
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Group Description */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#0f3a4d]/70 font-semibold uppercase tracking-wider">Group Description</p>
                {!isEditingGroupDesc && (
                  <button
                    onClick={() => setIsEditingGroupDesc(true)}
                    className="text-purple-600 hover:text-purple-800 text-xs font-bold"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingGroupDesc ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full px-3 py-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm text-[#0f3a4d] h-24 resize-none"
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    placeholder="Description"
                    disabled={isUpdatingGroup}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateGroupSettings({ description: editGroupDesc })}
                      disabled={isUpdatingGroup}
                      className="flex-1 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isUpdatingGroup ? 'Saving...' : 'Save Description'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingGroupDesc(false);
                        setEditGroupDesc(groupDetails.description || '');
                      }}
                      className="px-3 py-1.5 bg-[#E8DFD5] text-[#0f3a4d] text-xs font-bold rounded hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F5EBE0] p-3 rounded-lg border border-[#E8DFD5]">
                  <p className="text-sm text-[#0f3a4d] break-words whitespace-pre-wrap">
                    {groupDetails.description || <span className="text-slate-400 italic">No description set</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Controls */}
            <div className="p-4 border-b border-slate-100 bg-purple-50/50">
              <p className="text-xs text-[#0f3a4d]/70 mb-3 font-semibold uppercase tracking-wider">Group Permissions</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0f3a4d]">Send Messages</span>
                  <select
                    className="text-xs border border-[#E8DFD5] rounded px-2 py-1 bg-[#FAFAF8]"
                    value={groupDetails.isReadOnly ? 'admins' : 'all'}
                    onChange={(e) => updateGroupSettings({ settings: { onlyAdminsCanSendMessages: e.target.value === 'admins' } })}
                    disabled={isUpdatingGroup}
                  >
                    <option value="all">Everyone</option>
                    <option value="admins">Only Admins</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0f3a4d]">Edit Group Info</span>
                  <select
                    className="text-xs border border-[#E8DFD5] rounded px-2 py-1 bg-[#FAFAF8]"
                    value={groupDetails.infoAdminsOnly ? 'admins' : 'all'}
                    onChange={(e) => updateGroupSettings({ settings: { onlyAdminsCanEditInfo: e.target.value === 'admins' } })}
                    disabled={isUpdatingGroup}
                  >
                    <option value="all">Everyone</option>
                    <option value="admins">Only Admins</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Invite Link */}
            {(groupDetails.inviteCode || groupDetails.inviteLink) && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs text-[#0f3a4d]/70 mb-2 font-semibold">INVITE LINK</p>
                <div className="bg-[#F5EBE0] p-3 rounded-lg border border-[#E8DFD5]">
                  <p className="text-xs text-[#0f3a4d] break-all mb-2 font-mono">
                    {groupDetails.inviteLink || `https://chat.whatsapp.com/${groupDetails.inviteCode}`}
                  </p>
                  <button
                    onClick={() => {
                      const link = groupDetails.inviteLink || `https://chat.whatsapp.com/${groupDetails.inviteCode}`;
                      navigator.clipboard.writeText(link);
                      showToast('Invite link copied!', 'success');
                    }}
                    className="w-full px-3 py-2 bg-[#0f3a4d] hover:bg-[#1a4d66] text-white text-sm font-medium rounded transition-colors"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            )}

            {/* Group Info */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              {groupDetails.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0f3a4d]/70">Created</span>
                  <span className="text-sm font-medium text-[#0f3a4d]">
                    {new Date(groupDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {groupDetails.owner && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0f3a4d]/70">Owner</span>
                  <span className="text-sm font-medium text-[#0f3a4d] truncate ml-2">
                    {groupDetails.owner.replace('@c.us', '')}
                  </span>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#0f3a4d]/70 font-semibold">
                  PARTICIPANTS ({groupDetails.participants?.length || 0})
                </p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="text-purple-600 hover:text-purple-800 text-xs font-bold flex items-center gap-1"
                >
                  <UserPlus size={14} /> Add
                </button>
              </div>
              {groupDetails.participants && groupDetails.participants.length > 0 ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {groupDetails.participants.slice(0, 20).map((participant: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#F5EBE0] group"
                    >
                      <span className="text-sm text-[#0f3a4d] truncate">
                        {participant.id.replace('@c.us', '')}
                      </span>
                      <div className="flex items-center gap-2">
                        {(participant.isAdmin || participant.isSuperAdmin) && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                            Admin
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {groupDetails.participants.length > 20 && (
                    <p className="text-xs text-[#0f3a4d]/60 text-center py-2">
                      + {groupDetails.participants.length - 20} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#0f3a4d]/50 italic">No participants loaded</p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              {!groupDetails.inviteCode && !groupDetails.inviteLink && (
                <button 
                  onClick={handleGetInviteLink}
                  disabled={gettingInviteLink}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium transition-colors text-sm"
                >
                  {gettingInviteLink ? '⏳ Getting link...' : '🔗 Get Invite Link'}
                </button>
              )}
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F5EBE0]/60 hover:bg-[#E8DFD5] text-[#0f3a4d] font-medium transition-colors text-sm">
                🔔 Mute Group
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 font-medium transition-colors text-sm">
                🚪 Exit Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAFAF8] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#FAFAF8] p-4 border-b border-[#E8DFD5] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f3a4d]">Add Member</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-[#0f3a4d]/60 hover:text-[#0f3a4d] text-2xl leading-none"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f3a4d] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="e.g., 919876543210"
                  className="w-full px-3 py-2 border border-[#E8DFD5] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-[#0f3a4d]"
                />
                <p className="text-xs text-[#0f3a4d]/60 mt-1">Enter phone number with country code (no + symbol)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !newMemberPhone.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 bg-[#E8DFD5] text-[#0f3a4d] font-bold rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAFAF8] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="bg-[#FAFAF8] p-4 border-b border-[#E8DFD5] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0f3a4d]">Login to WhatsApp</h3>
                <p className="text-sm text-[#0f3a4d]/60">Scan the QR code with WhatsApp on your phone</p>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-[#0f3a4d]/60 hover:text-[#0f3a4d] text-2xl leading-none"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="order-2 md:order-1">
                <ol className="space-y-3 text-sm text-[#0f3a4d] list-decimal list-inside">
                  <li>Open WhatsApp on your phone.</li>
                  <li>Tap <span className="font-bold">Menu</span> (⋮) or <span className="font-bold">Settings</span>.</li>
                  <li>Tap <span className="font-bold">Linked devices</span>.</li>
                  <li>Tap <span className="font-bold">Link a device</span>.</li>
                  <li>Point your phone at this screen to capture the code.</li>
                </ol>

                {/* Troubleshooting help for common issues */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Getting "Try again later"?</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Click <strong>Force Reset</strong> below to clear session</li>
                    <li>• On your phone: WhatsApp → Settings → Linked Devices → Log out all</li>
                    <li>• Wait 5 minutes, then try scanning again</li>
                  </ul>
                </div>

                {/* Force Reset Instructions (shown after force reset) */}
                {forceResetInstructions && forceResetInstructions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-bold text-blue-800 mb-2">📋 Follow these steps:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {forceResetInstructions.map((instruction, idx) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button
                      onClick={refreshQr}
                      className="flex-1 bg-[#0f3a4d] hover:bg-[#1a4d66] text-white py-2.5 rounded-lg font-bold transition-all"
                    >
                      Refresh QR
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex-1 bg-[#0f3a4d] hover:bg-black disabled:opacity-60 text-white py-2.5 rounded-lg font-bold transition-all"
                      title="Logout by disconnecting the current session"
                    >
                      {disconnecting ? 'Logging out…' : 'Logout'}
                    </button>
                  </div>
                  
                  {/* Force Reset Button - for "Try again later" errors */}
                  <button
                    onClick={handleForceReset}
                    disabled={forceResetting}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    title="Force reset session if getting 'Try again later' error"
                  >
                    {forceResetting ? (
                      <>
                        <span className="animate-spin">🔄</span>
                        Resetting Session...
                      </>
                    ) : (
                      <>
                        🔧 Force Reset Session
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="order-1 md:order-2">
                <div className="bg-[#FAFAF8] rounded-xl border border-[#E8DFD5] p-4 flex items-center justify-center min-h-[320px]">
                  {qr ? (
                    <img src={qr} alt="QR Code" className="w-72 h-72 object-contain" />
                  ) : (
                    <div className="w-72 h-72 flex flex-col items-center justify-center text-[#0f3a4d]/60">
                      <div className="text-5xl mb-3">⏳</div>
                      <div className="text-sm font-bold">Generating QR…</div>
                      <div className="text-xs mt-1">Click “Refresh QR” if it takes too long</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAFAF8] rounded-lg p-6 w-full max-w-md shadow-xl animate-in">
            <h2 className="text-lg font-bold mb-4 text-black">Create New Lead</h2>
            
            <div className="space-y-4">
              {/* Admin User Assignment - visible to all admins */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Assign to Admin User (Optional)</label>
                <select
                  value={newLeadForm.assignedToUserId}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedToUserId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">(Default: current admin)</option>
                  {isSuperAdmin && userOptions.length > 0 ? (
                    userOptions.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name || u.email || u.userId}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Loading users...</option>
                  )}
                </select>
                <p className="text-[#0f3a4d]/70 text-xs mt-1">This controls which admin user can see/manage this lead.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Lead name"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+919876543210"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Source</label>
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="qr-whatsapp">QR WhatsApp</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Status</label>
                <select
                  value={newLeadForm.status}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Workshop/Program (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Yoga Retreat 2025, Advanced Pranayama"
                  value={newLeadForm.workshopName || ''}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, workshopName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5EBE0] border border-[#E8DFD5] rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowNewLeadModal(false);
                  setNewLeadForm({ name: '', email: '', phone: '', source: 'qr-whatsapp', status: 'lead', workshopName: '', assignedToUserId: '' });
                }}
                className="flex-1 px-4 py-2.5 bg-[#FAFAF8] hover:bg-[#F5EBE0] text-black rounded-lg font-bold transition-colors border border-[#E8DFD5]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewLead}
                disabled={!newLeadForm.name.trim() || !newLeadForm.email.trim() || !newLeadForm.phone.trim() || creatingLead}
                className="flex-1 px-4 py-2.5 bg-black hover:bg-[#0f3a4d] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
              >
                {creatingLead ? '⏳ Creating...' : '✅ Create Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAFAF8] rounded-lg p-6 w-full max-w-md shadow-xl animate-in">
            <h2 className="text-lg font-bold mb-4 text-[#0f3a4d]">Add New Contact</h2>
            
            <input
              type="text"
              placeholder="Enter contact name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newContactName.trim()) {
                  handleAddNewContact();
                }
              }}
              className="w-full px-4 py-2.5 border border-[#E8DFD5] rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#E8A645] focus:border-transparent"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewContactModal(false);
                  setNewContactName('');
                }}
                className="flex-1 px-4 py-2.5 bg-[#F5EBE0]/60 hover:bg-[#E8DFD5] text-[#0f3a4d] rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewContact}
                disabled={!newContactName.trim()}
                className="flex-1 px-4 py-2.5 bg-[#0f3a4d] hover:bg-[#1a4d66] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FAFAF8] rounded-lg p-6 w-full max-w-md shadow-xl animate-in">
            <h2 className="text-lg font-bold mb-4 text-[#0f3a4d] flex items-center gap-2">
              👥 Create New Group
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f3a4d] mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E8DFD5] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#0f3a4d] mb-1">
                  Participants (comma-separated phone numbers)
                </label>
                <textarea
                  placeholder="e.g., 919876543210, 919812345678"
                  value={newGroupParticipants}
                  onChange={(e) => setNewGroupParticipants(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E8DFD5] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24 resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter phone numbers with country code, separated by commas
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                  setNewGroupParticipants('');
                }}
                className="flex-1 px-4 py-2.5 bg-[#F5EBE0]/60 hover:bg-[#E8DFD5] text-[#0f3a4d] rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim() || !newGroupParticipants.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                {creatingGroup ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-[60] ${
          toast.type === 'success' ? 'bg-[#F5EBE0]0 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

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
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#D4A574] hover:text-white rounded transition-colors"
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
    </div>
  );
}

export default function QRWhatsAppInboxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#FAFAF8]"><div className="text-center"><div className="text-lg font-semibold text-[#8B7355] mb-2">Loading QR WhatsApp Inbox...</div><div className="w-8 h-8 border-4 border-[#D4A574] border-t-transparent rounded-full animate-spin mx-auto"></div></div></div>}>
      <QRWhatsAppInboxPageContent />
    </Suspense>
  );
}
