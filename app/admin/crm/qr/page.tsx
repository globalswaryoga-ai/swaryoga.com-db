'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
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
  Mic
} from 'lucide-react';

export default function QRWhatsAppInboxPage() {
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
  const [showQRModal, setShowQRModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const isOffline = status !== 'connected';

  // Reduce status/404 vibration: keep a lightweight backoff for polling on repeated failures
  const statusPollDelayRef = useRef<number>(15000);
  const lastBridgeErrorRef = useRef<string | null>(null);
  const lastStatusRef = useRef<string>('loading');

  // Diagnostics for troubleshooting (admin-only, hidden by default)
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastStatusCode, setLastStatusCode] = useState<number | null>(null);
  const [lastQrCode, setLastQrCode] = useState<number | null>(null);
  const [lastStatusData, setLastStatusData] = useState<any>(null);

  const [loggingInNewNumber, setLoggingInNewNumber] = useState(false);
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  
  // Media pending to be sent
  const [pendingMedia, setPendingMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
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
  
  // Track the phone parameter to always display at top
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(nameParam || null); // Initialize with param
  const [activeLeadId, setActiveLeadId] = useState<string | null>(leadIdParam || null);
  const [activeLeadNumber, setActiveLeadNumber] = useState<string | null>(null); // Human-friendly ID
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  
  // Cache lead data by phone number for sidebar display
  const [leadDataCache, setLeadDataCache] = useState<Record<string, any>>({});

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

  const bridgeFetch = async (path: string, init: RequestInit = {}, timeoutMs = 20_000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Use Next.js API proxy to avoid CORS/preflight issues
      const method = (init.method || 'GET').toUpperCase();
      const proxyUrl = '/api/admin/crm/whatsapp/qr-bridge';

      // For GET requests, use query param to avoid preflight
      if (method === 'GET') {
        const url = new URL(proxyUrl, window.location.origin);
        // FIX: Remove one layer of encoding if input path is already encoded
        // but normalize it for the proxy.
        url.searchParams.set('path', path);
        
        const res = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal
        });
        return res;
      }

      // For POST/PUT, send via body
      const proxyPayload = {
        action: method,
        path,
        ...(init.body && { body: init.body })
      };

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyPayload),
        signal: controller.signal
      });

      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  const parseBridgeError = async (res: Response) => {
    try {
      const data = await res.json();
      return data?.error || data?.message || `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  };

  const normalizeBridgeStatus = (raw: any): 'connected' | 'qr' | 'disconnected' | 'loading' => {
    const s = String(raw || '').toLowerCase();
    if (s === 'connected' || s === 'ready') return 'connected';
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
      setStatus(s);
    };

    const scheduleNext = () => {
      if (cancelled) return;
      window.setTimeout(checkStatus, statusPollDelayRef.current);
    };

    const checkStatus = async () => {
      try {
        const res = await bridgeFetch('/status', { method: 'GET' }, 8_000);
        if (!res.ok) {
          if (res.status === 404) {
            console.error('[404] WhatsApp Bridge /status endpoint not found.');
            setBridgeErrorIfChanged('Bridge service not responding (404). Make sure the WhatsApp bridge is running.');
          }
          const msg = await parseBridgeError(res);
          throw new Error(msg || 'Bridge unreachable');
        }
        setLastStatusCode(res.status);
        const data = await res.json();
        setLastStatusData(data);
        console.log('[checkStatus] /status response:', {
          status: data.status,
          hasQr: data.hasQr,
          qrLength: data.qr ? data.qr.length : 0,
          qrPresent: !!data.qr,
          fullResponse: data
        });
        setBridgeErrorIfChanged(null);

        // Reset backoff on success
        statusPollDelayRef.current = 15000;
        
        const newStatus = normalizeBridgeStatus(data.status);
        const statusChanged = status !== newStatus;
        setStatusIfChanged(newStatus);

        // Always set QR if it's in the response (regardless of status change)
        if (typeof data.qr === 'string' && data.qr.length > 0) {
          setQr(data.qr);
          // Auto-open modal if status changed to qr/disconnected or if we just got a QR
          if (statusChanged && (newStatus === 'qr' || newStatus === 'disconnected')) {
            setShowQRModal(true);
          }
        }
        // If hasQr flag is set but no QR data yet, just show the modal
        else if (data.hasQr || newStatus === 'qr' || newStatus === 'disconnected') {
          if (statusChanged) {
            setShowQRModal(true);
          }
        }
      } catch (err) {
        setStatusIfChanged('disconnected');
        setBridgeErrorIfChanged(err instanceof Error ? err.message : 'Bridge not reachable');

        // Backoff up to 60s when failing to reduce UI thrash
        statusPollDelayRef.current = Math.min(statusPollDelayRef.current * 2, 60000);
      }

      scheduleNext();
    };

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [bridgeUrl, status]);

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
          const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
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
        const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
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

  // Load chats
  useEffect(() => {
    if (status === 'connected') {
      const loadChats = async () => {
        try {
          const res = await bridgeFetch('/chats', { method: 'GET' }, 12_000);
          if (res.ok) {
            const data = await res.json();
            const newChats = data.chats || [];
            
            setChats((prevChats) => {
              const prevChatsMap = new Map(
                prevChats.map((chat) => [
                  typeof chat.id === 'string' ? chat.id : chat.id?._serialized,
                  chat
                ])
              );
              
              // Only update if something actually changed to prevent flickering
              let changed = false;
              const merged = newChats.map((newChat: any) => {
                const chatId = typeof newChat.id === 'string' ? newChat.id : newChat.id?._serialized;
                const existingChat = prevChatsMap.get(chatId);
                
                // Preserve lead data if it exists
                if (existingChat && (existingChat.leadId || existingChat.displayName)) {
                  return {
                    ...newChat,
                    displayName: existingChat.displayName || newChat.displayName,
                    leadId: existingChat.leadId,
                    leadStatus: existingChat.leadStatus,
                    leadLabel: existingChat.leadLabel,
                  };
                }
                return newChat;
              });

              // Simple length/ID check for change
              if (merged.length !== prevChats.length) changed = true;
              
              return merged;
            });

            // Persist chats to cache (best-effort)
            try {
              localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(newChats));
            } catch (e) {
              console.warn('[cache] Failed to persist chats:', e);
            }
            
            setBridgeError(null);
          }
        } catch (err) {
          console.error('[loadChats] Exception:', err);
        }
      };

      loadChats();
      const interval = setInterval(loadChats, 45000); // 45s instead of 30s
      return () => clearInterval(interval);
    }
  }, [status, bridgeUrl]);

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

  useEffect(() => {
    if (selectedChat && status === 'connected') {
      const chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized;
      
      // If this is a new "Lead Only" entry (no real chat yet), don't even try to fetch messages
      if (selectedChat.isLeadOnly && !messages.length) {
        setMessages([]);
        return;
      }

      // Skip if this chat returned 404 recently (new lead)
      if (chatId === last404Chat) return;

      const loadMessages = async () => {
        try {
          const res = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 12_000);
          
          if (res.ok) {
            const data = await res.json();
            const newMessages = data.messages || [];
            
            // Only update if message count or last message changed to prevent flickering
            setMessages(prev => {
              if (prev.length === newMessages.length) {
                const prevLast = prev[prev.length - 1];
                const newLast = newMessages[newMessages.length - 1];
                if (prevLast?.id === newLast?.id && prevLast?.body === newLast?.body) {
                  return prev;
                }
              }
              return newMessages;
            });
            
            setBridgeError(null);
            setLast404Chat(null);

            // Auto scroll to bottom
            setTimeout(() => {
              if (msgContainerRef.current) {
                msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
              }
            }, 100);

            // Mark as read in CRM
            if (activeLeadId || activePhone) {
              await fetch('/api/admin/crm/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  action: 'markThreadAsRead', 
                  leadId: activeLeadId,
                  phoneNumber: activePhone
                }),
              }).catch(err => console.warn('Failed to mark thread as read:', err));
            }
          } else if (res.status === 404) {
            console.warn(`[404] Messages not found for chat: ${chatId}. Stopping poll.`);
            // ALWAYS mark as 404 to stop polling, even if we had messages before (might be a sync issue)
            setLast404Chat(chatId);
            if (messages.length !== 0) {
              setMessages([]);
            }
          }
        } catch (err) {
          // ignore
        }
      };

      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    } else {
      setLast404Chat(null);
    }
  }, [selectedChat, status, bridgeUrl, last404Chat, messages.length]);

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

  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingMedia.length === 0) || !selectedChat || sending) return;

    // CHECK PERMISSIONS: Non-super-admins can only message assigned leads
    if (!isSuperAdmin && activeLeadId && !assignedLeadIds.has(activeLeadId)) {
      alert('❌ You can only message customers assigned to you. Please add this lead to your account first.');
      return;
    }

    setSending(true);
    try {
      let chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized;
      
      // If chatId doesn't have @c.us format (synthetic chat), format it as a phone number
      if (!chatId.includes('@')) {
        // Remove non-digits and format as WhatsApp ID
        const phoneOnly = chatId.replace(/\D/g, '');
        chatId = phoneOnly + '@c.us';
      }

      // 1. Send Media first if any
      if (pendingMedia.length > 0) {
        setUploadingMedia(true);
        for (let i = 0; i < pendingMedia.length; i++) {
          const file = pendingMedia[i];
          const fileId = `${file.name}-${Date.now()}`;
          setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

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
                  resolve(response);
                } catch (e) {
                  resolve({ success: true, url: null });
                }
              } else {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
            xhr.open('POST', '/api/admin/crm/whatsapp/media-upload');
            // Headers for auth/bridge
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
          });

          const uploadData = uploadResult as any;
          if (!uploadData.url) throw new Error('Upload failed - no URL');

          // Send media via bridge
          // Caption only for the first image if there's text? Or caption for each? 
          // Usually better to send text as separate message or caption for first.
          const mediaRes = await bridgeFetch('/send', {
            method: 'POST',
            body: JSON.stringify({
              chatId: chatId,
              media: uploadData.url,
              caption: i === 0 ? newMessage : '' // Add text as caption to first image
            })
          });

          if (!mediaRes.ok) {
            const sendError = await parseBridgeError(mediaRes);
            throw new Error(`Failed to send media: ${sendError}`);
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
      } else {
        // 2. Clear Text only if no media
        console.log('[sendMessage] Sending to chat:', chatId, 'message:', newMessage);
        const res = await bridgeFetch('/send', {
          method: 'POST',
          body: JSON.stringify({ chatId: chatId, message: newMessage })
        });

        if (res.ok) {
          setNewMessage('');
        } else {
          const err = await parseBridgeError(res);
          setBridgeError(err);
        }
      }

      setLast404Chat(null);
      // Reload messages
      const msgRes = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 12_000);
      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages(data.messages || []);
        
        // Auto scroll to bottom
        setTimeout(() => {
          if (msgContainerRef.current) {
            msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
          }
        }, 100);

        // Mark as read in CRM
        if (activeLeadId || activePhone) {
          await fetch('/api/admin/crm/messages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'markThreadAsRead', 
              leadId: activeLeadId,
              phoneNumber: activePhone
            }),
          }).catch(err => console.warn('Failed to mark thread as read:', err));
        }
      }
      setBridgeError(null);
    } catch (err) {
      console.error('[sendMessage] Error:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
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
        const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
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
    if (!newMessage.trim() || !selectedChat) return;
    
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

      // Then start the connection
      console.log('[handleConnect] Connecting...');
      const res = await bridgeFetch('/connect', { method: 'POST', body: '{}' }, 15_000);
      console.log('[handleConnect] Response OK:', res.ok);
      if (!res.ok) {
        const msg = await parseBridgeError(res);
        console.error('[handleConnect] Error:', msg);
        setBridgeError(msg);
        return;
      }

      // Fetch and display QR
      console.log('[handleConnect] Fetching QR...');
      await refreshQr();
      console.log('[handleConnect] Done!');
    } catch (err) {
      console.error('Failed to connect:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to connect');
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
      const res = await bridgeFetch(`/contact/${contactId}`, { method: 'GET' }, 8_000);
      if (res.ok) {
        const data = await res.json();
        setContactDetails(data);
        setShowContactPanel(true);
      }
    } catch (err) {
      console.error('Failed to load contact details:', err);
    }
  };

  // Load group details
  const loadGroupDetails = async (groupId: string | { _serialized: string }) => {
    try {
      const chatId = typeof groupId === 'string' ? groupId : groupId._serialized;
      const res = await bridgeFetch(`/group/${chatId}`, { method: 'GET' }, 8_000);
      if (res.ok) {
        const data = await res.json();
        setGroupDetails(data);
        setEditGroupName(data.name || '');
        setEditGroupDesc(data.description || '');
        setShowGroupPanel(true);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  };

  // Update group settings
  const updateGroupSettings = async (settings: any) => {
    if (!groupDetails) return;
    try {
      setIsUpdatingGroup(true);
      const chatId = groupDetails.id;
      const res = await bridgeFetch(`/group/${chatId}/settings`, {
        method: 'POST',
        body: JSON.stringify(settings)
      }, 10_000);
      
      if (res.ok) {
        // Refresh group details
        await loadGroupDetails(chatId);
        setIsEditingGroupName(false);
        setIsEditingGroupDesc(false);
      } else {
        const err = await parseBridgeError(res);
        alert(`Failed to update group: ${err}`);
      }
    } catch (err) {
      console.error('Failed to update group settings:', err);
      alert('Network error while updating group settings');
    } finally {
      setIsUpdatingGroup(false);
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

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (!confirm('Disconnect this shared WhatsApp session for everyone?')) return;
      setDisconnecting(true);
      setBridgeError(null);
      const res = await bridgeFetch('/disconnect', { method: 'POST', body: '{}' }, 15_000);
      if (!res.ok) {
        setBridgeError(await parseBridgeError(res));
        return;
      }
      setStatus('disconnected');
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const refreshQr = async () => {
    try {
      setBridgeError(null);
      console.log('[refreshQr] Fetching status...');
      const res = await bridgeFetch('/status', { method: 'GET' }, 8_000);
      console.log('[refreshQr] Status response ok?', res.ok);
      if (!res.ok) {
        const err = await parseBridgeError(res);
        console.error('[refreshQr] Status error:', err);
        setBridgeError(err);
        return;
      }
      const data = await res.json();
      console.log('[refreshQr] Status data:', data);
      setStatus(normalizeBridgeStatus(data.status));
      
      // QR is included directly in the /status response
      if (typeof data.qr === 'string' && data.qr.length > 0) {
        console.log('[refreshQr] QR found in status, setting it (length:', data.qr.length, ')');
        setQr(data.qr);
        setShowQRModal(true);
        return;
      } else {
        console.log('[refreshQr] QR not available in status response. hasQr:', data.hasQr, 'status:', data.status);
      }
      
      // Last resort: keep modal open with "Generating" message
      if (data.hasQr) {
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
    connected: 'bg-emerald-100 text-emerald-800',
    qr: 'bg-amber-100 text-amber-800',
    disconnected: 'bg-slate-200 text-slate-700',
    loading: 'bg-sky-100 text-sky-800'
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
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Left Sidebar - Chats (Hidden on mobile, shown on larger screens) */}
      <div className="hidden md:flex md:w-80 bg-white border-r border-slate-200 flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-3 space-y-3">
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(userProfile?.name || 'WhatsApp')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{userProfile?.name || 'WhatsApp'}</div>
                <div className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusPill}`}>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      status === 'connected'
                        ? 'bg-emerald-600'
                        : status === 'qr'
                          ? 'bg-amber-600 animate-pulse'
                          : status === 'loading'
                            ? 'bg-sky-600 animate-pulse'
                            : 'bg-slate-500'
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
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                title="Add new contact"
              >
                <Plus size={16} />
                New
              </button>

              {/* Login Button - Green (when disconnected) */}
              {status !== 'connected' && (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1"
                  title="Login with QR"
                >
                  {connecting ? <RefreshCw className="animate-spin" size={16} /> : '↑'} Login
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
                className="mt-2 w-full py-1 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700"
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
              </div>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="mt-1 text-blue-600 hover:underline text-[9px]"
              >
                {showDiagnostics ? 'Hide' : 'Show'} details
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-white space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              onClick={() => setShowNewLeadModal(true)}
              title="Add new lead"
              className="px-4 py-2 bg-purple-200 hover:bg-purple-300 text-purple-900 border border-purple-400 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              <span className="text-xs hidden sm:inline">Lead</span>
            </button>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
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
              // Sort by timestamp (newest first)
              .sort((a, b) => {
                const aTime = a.timestamp || 0;
                const bTime = b.timestamp || 0;
                return bTime - aTime;
              })
              .map((chat) => (
                <div
                  key={typeof chat.id === 'string' ? chat.id : chat.id._serialized}
                  onClick={() => {
                    setSelectedChat(chat);
                    markChatAsRead(chat);
                  }}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-all ${
                    selectedChat &&
                    (typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized) ===
                      (typeof chat.id === 'string' ? chat.id : chat.id._serialized)
                      ? 'bg-green-50 border-l-4 border-l-green-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Unread Indicator Badge */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {chat.isGroup ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          👥
                        </div>
                      ) : chat.profilePicture ? (
                        <img
                          src={chat.profilePicture}
                          alt={chat.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {getInitials(chat.name || 'U')}
                        </div>
                      )}
                      
                      {/* Unread Indicator Badge */}
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </span>
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-200 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Name + Date on same line */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate text-sm">
                          {chat.displayName || chat.name || 'Unknown'}
                        </p>
                        {/* Today's Date */}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Phone number - second line (show if displayName is set and name is phone) */}
                      {chat.displayName && (
                        <p className="text-[11px] text-slate-500 truncate">
                          📱 {String(chat.name).replace(/\D/g, '').slice(-10)}
                        </p>
                      )}
                      
                      {/* Phone number - second line (show if no displayName and name is all digits) */}
                      {!chat.displayName && /^\d+$/.test(String(chat.name)) && (
                        <p className="text-[11px] text-slate-500 truncate">
                          📱 {chat.name}
                        </p>
                      )}
                      
                      {/* Lead Details Tags: ID, Status, Label - third line */}
                      {(chat.leadId || chat.leadStatus || chat.leadLabel) && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {/* ID Tag */}
                          {chat.leadId && (
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[9px] font-bold rounded border border-pink-300 whitespace-nowrap">
                              ID: {chat.leadNumber || chat.leadId.toString().slice(-6)}
                            </span>
                          )}
                          
                          {/* Status Tag */}
                          {chat.leadStatus && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap ${
                              chat.leadStatus?.toUpperCase() === 'LEAD' ? 'bg-green-100 text-green-700 border-green-300' :
                              chat.leadStatus?.toUpperCase() === 'PROSPECT' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              chat.leadStatus?.toUpperCase() === 'CUSTOMER' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                              chat.leadStatus?.toUpperCase() === 'INACTIVE' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                              'bg-slate-100 text-slate-700 border-slate-300'
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
                      {!(chat.leadId || chat.leadStatus || chat.leadLabel) && (
                        <p className="text-[11px] text-slate-500 truncate">
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
        </div>
      </div>

      {/* Right Side - Chat Messages */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {/* Top Header - Before Chat Area */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xs">Swar Yoga</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Home Button - Blue */}
            <button
              onClick={() => {
                window.location.href = '/admin/crm';
              }}
              className="px-2 py-1 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-1"
              title="Go to CRM Dashboard"
            >
              <span>🏠</span> Home
            </button>

            {/* QR Button - Black */}
            <button
              onClick={handleNewNumber}
              disabled={loggingInNewNumber || disconnecting || connecting}
              className="px-2 py-1 rounded text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition-colors flex items-center gap-1"
              title="Scan new QR code"
            >
              <span>{loggingInNewNumber ? '⟳' : '📱'}</span> QR
            </button>

            {/* Logout Button - Red */}
            {status === 'connected' && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-1"
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
            <div className="border-b border-slate-200 p-3 bg-[#f0f2f5] flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {selectedChat.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    👥
                  </div>
                ) : selectedChat.profilePicture ? (
                  <img
                    src={selectedChat.profilePicture}
                    alt={selectedChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
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
                  <h2 className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">
                    {activeName || selectedChat.name}
                  </h2>
                  
                  {/* Phone Number (subtitle) */}
                  {activePhone && (
                    <p className="text-[11px] text-slate-600 truncate">
                      📱 {activePhone}
                    </p>
                  )}
                  
                  {/* Lead Details: ID, Status, Label Tags */}
                  {(activeLeadId || activeStatus || activeLabel) && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {/* ID Tag */}
                      {activeLeadId && (
                        <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded border border-pink-300">
                          ID: {activeLeadNumber || activeLeadId.slice(-6)}
                        </span>
                      )}
                      
                      {/* Status Tag */}
                      {activeStatus && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          activeStatus === 'LEAD' ? 'bg-green-100 text-green-700 border-green-300' :
                          activeStatus === 'PROSPECT' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          activeStatus === 'CUSTOMER' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                          activeStatus === 'INACTIVE' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {activeStatus}
                        </span>
                      )}
                      
                      {/* Label Tag */}
                      {activeLabel ? (
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded border border-cyan-300">
                          {activeLabel}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded border border-cyan-300">
                          NO LABEL
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Status/Online Indicator */}
                  {activeLeadId && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedChat?.isOnline ? (
                        <>✅ online</>
                      ) : selectedChat?.lastSeen ? (
                        <>⏰ last seen {new Date(selectedChat.lastSeen).toLocaleDateString()}</>
                      ) : (
                        <>offline</>
                      )}
                    </p>
                  )}
                  {!activeLeadId && !selectedChat.isGroup && !activePhone && (
                    <p className="text-[11px] text-slate-500">
                      {status === 'connected' ? 'online' : 'offline'}
                    </p>
                  )}
                  {!activeLeadId && selectedChat.isGroup && selectedChat.memberCount && (
                    <p className="text-[11px] text-slate-500">
                      Group · {selectedChat.memberCount} members
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Close Button Only */}
              <button
                onClick={() => setSelectedChat(null)}
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
                aria-label="Close chat"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
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

                    const ackColor = msg.ack === 3 ? 'text-blue-500' : 'text-slate-500';
                    const ackDisplay = renderAckStatus(msg.ack);

                    // Check if message has media
                    const hasMedia = msg.hasMedia || msg.mediaUrl;
                    const mediaUrl = msg.mediaUrl;
                    const isImage = mediaUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl);
                    const isVideo = mediaUrl && /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl);
                    const isPDF = mediaUrl && /\.pdf$/i.test(mediaUrl);

                    return (
                      <div key={idx} className={`flex flex-col gap-1 ${msg.fromMe ? 'items-end' : 'items-start'}`}>
                        {/* Sender Name */}
                        {currentUserName && (
                          <div className="text-[10px] font-bold text-slate-600 px-2">
                            {msg.fromMe ? `👨‍💼 ${currentUserName}` : '👤 Customer'}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`flex gap-2 ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs rounded-2xl px-4 py-2 text-base leading-tight shadow-sm font-sans ${
                              msg.fromMe
                                ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                                : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'
                            }`}
                            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
                          >

                        {/* Media Content */}
                        {hasMedia && mediaUrl ? (
                          <div className="space-y-2">
                            {isImage && (
                              <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                                <img
                                  src={mediaUrl}
                                  alt="image"
                                  className="w-full h-auto max-w-xs object-cover rounded-lg"
                                  onError={(e) => {
                                    console.error('[image] Load error:', mediaUrl);
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22sans-serif%22 font-size=%2214%22 fill=%22%2364748b%22%3E📷 Failed to load%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            )}

                            {isVideo && (
                              <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="w-full h-auto max-w-xs object-cover rounded-lg"
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            )}

                            {msg.body && msg.body.trim() && (
                              <div className="break-words font-normal">{msg.body}</div>
                            )}
                          </div>
                        ) : (
                          <div className="break-words font-normal">{msg.body}</div>
                        )}

                        {msg.fromMe && ackDisplay && (
                          <div className={`text-[11px] mt-0.5 flex items-center gap-0.5 justify-end font-medium tracking-tight ${ackColor}`}>
                            {ackDisplay}
                          </div>
                        )}
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
            <div className="border-t border-slate-200 bg-[#f0f2f5]/50 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-3 py-1 border-b border-slate-100 bg-white/80">
                <button
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 relative ${
                    showMediaMenu ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Attach media"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showQuickReplies ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Quick replies"
                >
                  <Zap size={18} />
                </button>

                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showTemplates ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Message templates"
                >
                  <FileText size={18} />
                </button>

                <button
                  onClick={() => setShowSchedulePanel(!showSchedulePanel)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showSchedulePanel ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Schedule or delay message"
                >
                  <Clock size={18} />
                </button>

                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showEmojiPicker ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Emoji picker"
                >
                  <Smile size={18} />
                </button>

                {/* Media Dropdown Menu */}
                {showMediaMenu && (
                  <div className="absolute bottom-28 left-4 bg-white rounded-xl shadow-2xl border border-slate-200 min-w-[200px] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 transition-colors border-b border-slate-50"
                    >
                      <ImageIcon className="text-emerald-500" size={18} />
                      Photos & Videos
                    </button>
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 transition-colors border-b border-slate-50"
                    >
                      <FileIcon className="text-blue-500" size={18} />
                      Document
                    </button>
                    <button
                      onClick={() => { mediaInputRef.current?.click(); setShowMediaMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Mic className="text-orange-500" size={18} />
                      Audio
                    </button>
                  </div>
                )}
              </div>

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
              {mediaPreviews.length > 0 && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-slate-50 border-t border-slate-200">
                  {mediaPreviews.map((preview, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-300" 
                      />
                      <button 
                        onClick={() => removePendingMedia(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white px-1 py-0.5 truncate rounded-b-lg">
                        {pendingMedia[idx]?.name}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => mediaInputRef.current?.click()}
                    className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
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
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((newMessage.trim() || pendingMedia.length > 0) && !sending && status === 'connected') {
                        handleScheduledSend();
                      }
                    }
                  }}
                  placeholder={pendingMedia.length > 0 ? "Add a caption..." : "Type a message... (Enter to send)"}
                  className="flex-1 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none min-h-[44px] max-h-[200px] leading-relaxed transition-all shadow-sm"
                  rows={1}
                />

                <button
                  onClick={handleScheduledSend}
                  disabled={sending || (!newMessage.trim() && pendingMedia.length === 0) || status !== 'connected' || uploadingMedia}
                  className="flex-shrink-0 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-sm transition-all flex items-center justify-center hover:scale-105 active:scale-95"
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
                        <div key={fileId} className="text-[10px] text-slate-500">
                          <div className="flex justify-between mb-1">
                            <span className="truncate max-w-[150px]">{fileId.split('-')[0]}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Emoji Picker Grid */}
                  {showEmojiPicker && (
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 bg-white p-2 rounded-xl border border-slate-200 max-h-40 overflow-y-auto shadow-inner my-1 animate-in zoom-in-95 duration-200">
                      {['😊', '😂', '🥰', '😍', '🎉', '🎊', '🔥', '👍', '❤️', '😢', '😡', '🤔', '👏', '🙌', '💪', '🚀', '⭐', '✨', '💯', '🎈', '🎁', '🌟', '💝', '😎', '🤗', '😘', '😌', '😴', '😷', '�', '�', '�', '🙌', '�'].map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                          className="p-1.5 hover:bg-slate-100 rounded text-xl transition-colors hover:scale-125 duration-100"
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
              <div className="text-2xl font-bold text-slate-800 mb-2">WhatsApp Web</div>
              <p className="text-sm text-slate-600">
                {status === 'connected'
                  ? 'Select a chat on the left to start messaging.'
                  : 'Click “Login (QR)” to connect, then scan the QR with your phone.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Details Side Panel */}
      {showContactPanel && contactDetails && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-lg z-40 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Contact Details</h3>
            <button
              onClick={() => setShowContactPanel(false)}
              className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
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
                <h2 className="text-lg font-bold text-slate-900">{contactDetails.name}</h2>
                <p className="text-sm text-slate-500">{contactDetails.number}</p>
              </div>
            </div>

            {/* Status & Stats */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-slate-900">Online</span>
                </span>
              </div>
              {contactDetails.lastSeen && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Seen</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(contactDetails.lastSeen * 1000).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Messages</span>
                <span className="text-sm font-medium text-slate-900">{contactDetails.unreadCount || 0} unread</span>
              </div>
            </div>

            {/* Last Message */}
            {contactDetails.lastMessage && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs text-slate-600 mb-2 font-semibold">LAST MESSAGE</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900 break-words">{contactDetails.lastMessage.body}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(contactDetails.lastMessage.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium transition-colors text-sm">
                📞 Call
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium transition-colors text-sm">
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
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-lg z-40 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Group Settings</h3>
            <button
              onClick={() => setShowGroupPanel(false)}
              className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
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
                      className="w-full px-3 py-1.5 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 font-medium"
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
                        className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative px-4">
                    <h2 className="text-lg font-bold text-slate-900 pr-6">{groupDetails.name}</h2>
                    <button
                      onClick={() => setIsEditingGroupName(true)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-600 transition-opacity"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <p className="text-sm text-slate-500">
                      {groupDetails.participants?.length || 0} participants
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Group Description */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Group Description</p>
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
                    className="w-full px-3 py-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm text-slate-800 h-24 resize-none"
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
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-900 break-words whitespace-pre-wrap">
                    {groupDetails.description || <span className="text-slate-400 italic">No description set</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Controls */}
            <div className="p-4 border-b border-slate-100 bg-purple-50/50">
              <p className="text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider">Group Permissions</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Send Messages</span>
                  <select
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    value={groupDetails.isReadOnly ? 'admins' : 'all'}
                    onChange={(e) => updateGroupSettings({ settings: { onlyAdminsCanSendMessages: e.target.value === 'admins' } })}
                    disabled={isUpdatingGroup}
                  >
                    <option value="all">Everyone</option>
                    <option value="admins">Only Admins</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Edit Group Info</span>
                  <select
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
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
            {groupDetails.inviteCode && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs text-slate-600 mb-2 font-semibold">INVITE LINK</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-700 break-all mb-2 font-mono">
                    https://chat.whatsapp.com/{groupDetails.inviteCode}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://chat.whatsapp.com/${groupDetails.inviteCode}`);
                      alert('Invite link copied to clipboard!');
                    }}
                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors"
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
                  <span className="text-sm text-slate-600">Created</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(groupDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {groupDetails.owner && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Owner</span>
                  <span className="text-sm font-medium text-slate-900 truncate ml-2">
                    {groupDetails.owner.replace('@c.us', '')}
                  </span>
                </div>
              )}
            </div>

            {/* Participants */}
            {groupDetails.participants && groupDetails.participants.length > 0 && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs text-slate-600 mb-2 font-semibold">
                  PARTICIPANTS ({groupDetails.participants.length})
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {groupDetails.participants.slice(0, 20).map((participant: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-50"
                    >
                      <span className="text-sm text-slate-700 truncate">
                        {participant.id.replace('@c.us', '')}
                      </span>
                      {(participant.isAdmin || participant.isSuperAdmin) && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                  {groupDetails.participants.length > 20 && (
                    <p className="text-xs text-slate-500 text-center py-2">
                      + {groupDetails.participants.length - 20} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium transition-colors text-sm">
                🔔 Mute Group
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 font-medium transition-colors text-sm">
                🚪 Exit Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Login to WhatsApp</h3>
                <p className="text-sm text-slate-500">Scan the QR code with WhatsApp on your phone</p>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="order-2 md:order-1">
                <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
                  <li>Open WhatsApp on your phone.</li>
                  <li>Tap <span className="font-bold">Menu</span> (⋮) or <span className="font-bold">Settings</span>.</li>
                  <li>Tap <span className="font-bold">Linked devices</span>.</li>
                  <li>Tap <span className="font-bold">Link a device</span>.</li>
                  <li>Point your phone at this screen to capture the code.</li>
                </ol>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={refreshQr}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold transition-all"
                  >
                    Refresh QR
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-60 text-white py-2.5 rounded-lg font-bold transition-all"
                    title="Logout by disconnecting the current session"
                  >
                    {disconnecting ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              </div>

              <div className="order-1 md:order-2">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-center min-h-[320px]">
                  {qr ? (
                    <img src={qr} alt="QR Code" className="w-72 h-72 object-contain" />
                  ) : (
                    <div className="w-72 h-72 flex flex-col items-center justify-center text-slate-500">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-in">
            <h2 className="text-lg font-bold mb-4 text-black">Create New Lead</h2>
            
            <div className="space-y-4">
              {/* Admin User Assignment - visible to all admins */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Assign to Admin User (Optional)</label>
                <select
                  value={newLeadForm.assignedToUserId}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedToUserId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
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
                <p className="text-slate-600 text-xs mt-1">This controls which admin user can see/manage this lead.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Lead name"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Source</label>
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowNewLeadModal(false);
                  setNewLeadForm({ name: '', email: '', phone: '', source: 'qr-whatsapp', status: 'lead', workshopName: '', assignedToUserId: '' });
                }}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-black rounded-lg font-bold transition-colors border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewLead}
                disabled={!newLeadForm.name.trim() || !newLeadForm.email.trim() || !newLeadForm.phone.trim() || creatingLead}
                className="flex-1 px-4 py-2.5 bg-black hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-in">
            <h2 className="text-lg font-bold mb-4 text-slate-900">Add New Contact</h2>
            
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
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewContactModal(false);
                  setNewContactName('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewContact}
                disabled={!newContactName.trim()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
