'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

export default function QRWhatsAppInboxPage() {
  const token = useAuth();
  const searchParams = useSearchParams();
  const phoneParam = searchParams?.get('phone');
  const leadIdParam = searchParams?.get('leadId');
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

  const [loggingInNewNumber, setLoggingInNewNumber] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  
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
  const [activeName, setActiveName] = useState<string | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
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

  const bridgeFetch = async (path: string, init: RequestInit = {}, timeoutMs = 12_000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Use Next.js API proxy to avoid CORS/preflight issues
      const method = (init.method || 'GET').toUpperCase();
      const proxyUrl = '/api/admin/crm/whatsapp/qr-bridge';

      // For GET requests, use query param to avoid preflight
      if (method === 'GET') {
        const url = new URL(proxyUrl, window.location.origin);
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

  // Check status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await bridgeFetch('/status', { method: 'GET' }, 8_000);
        if (!res.ok) {
          const msg = await parseBridgeError(res);
          throw new Error(msg || 'Bridge unreachable');
        }
        const data = await res.json();
        setBridgeError(null);
        setStatus(normalizeBridgeStatus(data.status));

        // Different bridge builds may expose QR differently. Prefer any explicit QR string, otherwise
        // preserve our existing QR value and rely on the modal "refresh QR" to fetch a new one.
        if (typeof data.qr === 'string' && data.qr.length > 0) setQr(data.qr);
      } catch (err) {
        setStatus('disconnected');
        setBridgeError(err instanceof Error ? err.message : 'Bridge not reachable');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [bridgeUrl]);

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
    if (leadIdParam && token) {
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
      
      // Normalize the phone parameter
      const normalizedPhone = String(phoneParam).replace(/\D/g, '');
      
      // Find chat by phone number in existing chats
      const matchingChat = chats.find((chat) => {
        const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
        return chatPhone === normalizedPhone;
      });

      if (matchingChat) {
        console.log('[Auto-Select] Found matching chat for phone:', phoneParam);
        setSelectedChat(matchingChat);
      } else {
        // Chat not found, create a synthetic chat and ADD IT TO THE LIST
        console.log('[Auto-Select] Chat not found, creating new chat for phone:', phoneParam);
        
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
          isGroup: false,
          isReadOnly: false,
          unreadCount: 0,
          timestamp: null,
          archived: false,
        };

        console.log('[Auto-Select] Created synthetic chat for:', phoneParam);
        
        // ADD TO CHAT LIST so it appears immediately
        setChats((prevChats) => {
          // Check if already in list
          const exists = prevChats.some((c) => {
            const cPhone = String(c.name || c.id || '').replace(/\D/g, '');
            return cPhone === normalizedPhone;
          });
          
          if (!exists) {
            // Add to top of list
            return [syntheticChat, ...prevChats];
          }
          return prevChats;
        });

        setSelectedChat(syntheticChat);
        setBridgeError(`📱 Chat ready for ${phoneParam}. Type your message to start.`);
        setTimeout(() => setBridgeError(null), 3000);
      }
    }
  }, [phoneParam, status]);

  // Load chats
  useEffect(() => {
    if (status === 'connected') {
      const loadChats = async () => {
        try {
          console.log('[loadChats] Fetching chats...');
          const res = await bridgeFetch('/chats', { method: 'GET' }, 12_000);
          console.log('[loadChats] Response ok?', res.ok, 'status:', res.status);
          if (res.ok) {
            const data = await res.json();
            console.log('[loadChats] Got chats:', data.chats?.length || 0);
            setChats(data.chats || []);
            setBridgeError(null);
          } else {
            const err = await parseBridgeError(res);
            console.error('[loadChats] Error:', err);
            setBridgeError(err);
          }
        } catch (err) {
          console.error('[loadChats] Exception:', err);
          setBridgeError(err instanceof Error ? err.message : 'Failed to load chats');
        }
      };

      loadChats();
      const interval = setInterval(loadChats, 5000);
      return () => clearInterval(interval);
    }
  }, [status, bridgeUrl]);

  // Fetch lead data for all chats to populate ID/Status/Label in sidebar
  useEffect(() => {
    if (chats.length > 0 && token) {
      const fetchLeadDataForChats = async () => {
        for (const chat of chats) {
          // Only fetch if chat has a phone number name
          if (chat.name && /^\d+$/.test(String(chat.name))) {
            const normalizedPhone = String(chat.name).replace(/\D/g, '');
            
            // Skip if already cached
            if (leadDataCache[normalizedPhone]) {
              continue;
            }
            
            try {
              const response = await fetch(`/api/admin/crm/leads/by-phone/${encodeURIComponent(normalizedPhone)}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const lead = await response.json();
                
                // Update the chat with lead data
                setChats((prevChats) =>
                  prevChats.map((c) => {
                    const cPhone = String(c.name || '').replace(/\D/g, '');
                    if (cPhone === normalizedPhone) {
                      return {
                        ...c,
                        displayName: lead.name,
                        leadId: lead._id,
                        leadStatus: lead.status,
                        leadLabel: lead.label,
                      };
                    }
                    return c;
                  })
                );
                
                // Cache the result
                setLeadDataCache((prev) => ({
                  ...prev,
                  [normalizedPhone]: lead,
                }));
              }
            } catch (error) {
              console.error('Failed to fetch lead for phone:', normalizedPhone, error);
            }
          }
        }
      };
      
      fetchLeadDataForChats();
    }
  }, [chats.length, token]);

  // Fetch all leads from database and merge into chat list
  useEffect(() => {
    if (!token || status !== 'connected') return;

    const fetchAllLeads = async () => {
      try {
        console.log('[fetchAllLeads] Fetching leads (isSuperAdmin:', isSuperAdmin, ')...');
        const response = await fetch('/api/admin/crm/leads?limit=1000', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('[fetchAllLeads] Failed to fetch leads:', response.status);
          return;
        }

        const data = await response.json();
        const leads = Array.isArray(data?.data?.leads) ? data.data.leads : Array.isArray(data?.data) ? data.data : [];
        console.log('[fetchAllLeads] Got', leads.length, 'leads. Current user:', currentUserId);

        // Build set of assigned lead IDs for permission checking
        const assignedIds = new Set<string>(leads.map((l: any) => String(l._id)));
        setAssignedLeadIds(assignedIds);
        console.log('[fetchAllLeads] Assigned lead count:', assignedIds.size);

        // Create lead objects as synthetic chats if not already in chats
        setChats((prevChats) => {
          const chatPhoneMap = new Set(
            prevChats.map((c) => String(c.name || '').replace(/\D/g, ''))
          );

          // Filter leads that don't already have a WhatsApp chat
          const newLeadsToAdd = leads.filter((lead: any) => {
            const leadPhone = String(lead.phoneNumber || '').replace(/\D/g, '');
            return !chatPhoneMap.has(leadPhone);
          });

          console.log('[fetchAllLeads] Adding', newLeadsToAdd.length, 'new leads to chat list');

          // Convert leads to chat objects
          const leadChats = newLeadsToAdd.map((lead) => ({
            id: lead.phoneNumber,
            name: lead.phoneNumber,
            displayName: lead.name,
            isGroup: false,
            lastMessage: null,
            timestamp: null,
            leadId: lead._id,
            leadStatus: lead.status,
            leadLabel: lead.label,
            isLeadOnly: true, // Flag to indicate this is a database lead, not an active WhatsApp chat
          }));

          // Merge: chats first, then lead-only entries
          return [...prevChats, ...leadChats];
        });
      } catch (error) {
        console.error('[fetchAllLeads] Exception:', error);
      }
    };

    // Fetch leads when component mounts or status changes to connected
    fetchAllLeads();

    // Optionally refresh leads periodically (every 30 seconds)
    const interval = setInterval(fetchAllLeads, 30000);
    return () => clearInterval(interval);
  }, [token, status]);

  // Load user profile
  useEffect(() => {
    if (status === 'connected') {
      const loadProfile = async () => {
        try {
          console.log('[loadProfile] Fetching user profile...');
          const res = await bridgeFetch('/profile', { method: 'GET' }, 8_000);
          if (res.ok) {
            const data = await res.json();
            console.log('[loadProfile] Got profile:', data.name);
            setUserProfile(data);
          } else {
            console.warn('[loadProfile] Failed to get profile');
          }
        } catch (err) {
          console.warn('[loadProfile] Exception:', err);
        }
      };

      loadProfile();
    }
  }, [status, bridgeUrl]);

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChat && status === 'connected') {
      const loadMessages = async () => {
        try {
          const chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized;
          console.log('[loadMessages] Loading messages for chat:', chatId);
          const res = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 12_000);
          console.log('[loadMessages] Response ok?', res.ok, 'status:', res.status);
          if (res.ok) {
            const data = await res.json();
            console.log('[loadMessages] Got messages:', data.messages?.length || 0);
            setMessages(data.messages || []);
            setBridgeError(null);
          } else {
            const err = await parseBridgeError(res);
            console.error('[loadMessages] Error:', err);
            setBridgeError(err);
          }
        } catch (err) {
          console.error('[loadMessages] Exception:', err);
          setBridgeError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      };

      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat, status, bridgeUrl]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      
      if (response.ok) {
        const lead = await response.json();
        // Cache the result
        setLeadDataCache((prev) => ({
          ...prev,
          [normalizedPhone]: lead,
        }));
        return lead;
      }
    } catch (error) {
      console.error('Failed to fetch lead by phone:', error);
    }
    
    return null;
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

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

      console.log('[sendMessage] Sending to chat:', chatId, 'message:', newMessage);
      const res = await bridgeFetch('/send', {
        method: 'POST',
        body: JSON.stringify({ chatId: chatId, message: newMessage })
      });

      console.log('[sendMessage] Response ok?', res.ok, 'status:', res.status);
      if (res.ok) {
        console.log('[sendMessage] Message sent, clearing and reloading...');
        setNewMessage('');
        // Reload messages
        const msgRes = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 12_000);
        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.messages || []);
          console.log('[sendMessage] Reloaded messages:', data.messages?.length || 0);
        }
        setBridgeError(null);
      } else {
        const err = await parseBridgeError(res);
        console.error('[sendMessage] Error:', err);
        setBridgeError(err);
      }
    } catch (err) {
      console.error('[sendMessage] Exception:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Upload media to S3 and send
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat || !event.target.files) return;

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadingMedia(true);
    setShowMediaMenu(false);

    try {
      let chatId = typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized;
      
      // If chatId doesn't have @c.us format (synthetic chat), format it as a phone number
      if (!chatId.includes('@')) {
        const phoneOnly = chatId.replace(/\D/g, '');
        chatId = phoneOnly + '@c.us';
      }
      
      for (const file of files) {
        const fileId = `${file.name}-${Date.now()}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);

        console.log('[uploadMedia] Uploading:', file.name, 'Size:', file.size);

        // Upload to backend (uses proxy to S3)
        const uploadRes = await fetch('/api/admin/crm/whatsapp/media-upload', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Bridge-Secret': bridgeSecret,
            'X-Chat-Id': chatId
          }
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          const errorMsg = error.error || 'Upload failed';
          const details = error.details || {};
          
          // Provide helpful error messages
          let fullMessage = errorMsg;
          if (details.message) {
            fullMessage += `: ${details.message}`;
          }
          if (details.hasAccessKey === false) {
            fullMessage += '\n❌ Missing AWS_ACCESS_KEY_ID on bridge';
          }
          if (details.hasSecretKey === false) {
            fullMessage += '\n❌ Missing AWS_SECRET_ACCESS_KEY on bridge';
          }
          
          console.error('[uploadMedia] Backend error:', fullMessage, error);
          throw new Error(fullMessage);
        }

        const uploadData = await uploadRes.json();
        console.log('[uploadMedia] Upload success:', uploadData);

        // Send media message with URL
        const mediaRes = await bridgeFetch('/send', {
          method: 'POST',
          body: JSON.stringify({
            to: chatId,
            media: uploadData.url,
            caption: file.name
          })
        });

        if (mediaRes.ok) {
          console.log('[uploadMedia] Media message sent');
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        } else {
          throw new Error('Failed to send media message');
        }
      }

      // Reload messages
      const msgRes = await bridgeFetch(`/messages/${encodeURIComponent(chatId)}`, { method: 'GET' }, 12_000);
      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages(data.messages || []);
      }

      setBridgeError(null);
    } catch (err) {
      console.error('[uploadMedia] Error:', err);
      setBridgeError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
      setUploadProgress({});
      // Reset file input
      if (mediaInputRef.current) {
        mediaInputRef.current.value = '';
      }
    }
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

      console.log('[NewLead] Created lead:', createData.data?._id);

      // Close modal and reset form
      setShowNewLeadModal(false);
      setNewLeadForm({ name: '', email: '', phone: '', source: 'qr-whatsapp', status: 'lead', workshopName: '', assignedToUserId: '' });

      // Try to find and open the chat for this number
      const normalizedPhone = newLeadForm.phone.replace(/\D/g, '');
      const matchingChat = chats.find((chat) => {
        const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
        return chatPhone === normalizedPhone;
      });

      if (matchingChat) {
        setSelectedChat(matchingChat);
        setBridgeError(null);
      } else {
        // Chat not yet available, might need to wait or create a new conversation
        console.log('[NewLead] Chat not found yet, might be created soon');
        setBridgeError('Lead created. Chat should appear shortly.');
        
        // Try to reload chats
        setTimeout(() => {
          const loadChats = async () => {
            try {
              const res = await bridgeFetch('/chats', { method: 'GET' }, 12_000);
              if (res.ok) {
                const data = await res.json();
                setChats(data.chats || []);
                
                // Try again to find the chat
                const updatedChat = data.chats.find((chat: any) => {
                  const chatPhone = String(chat.name || chat.id || '').replace(/\D/g, '');
                  return chatPhone === normalizedPhone;
                });
                if (updatedChat) {
                  setSelectedChat(updatedChat);
                  setBridgeError(null);
                }
              }
            } catch (err) {
              console.error('[NewLead] Failed to reload chats');
            }
          };
          loadChats();
        }, 1500);
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

  // Mark chat as read
  const markChatAsRead = async (chat: any) => {
    try {
      // Update the chat in state immediately to show lavender dot
      const chatId = typeof chat.id === 'string' ? chat.id : chat.id._serialized;
      setChats((prev) =>
        prev.map((c) => {
          const cId = typeof c.id === 'string' ? c.id : c.id._serialized;
          if (cId === chatId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        })
      );

      // Call API to mark as read on backend
      await fetch(`/api/admin/crm/whatsapp/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId,
          phone: chat.name,
        }),
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
      
      // If status says QR is available, fetch it from /qr endpoint
      if (data.hasQr || data.status === 'qr') {
        console.log('[refreshQr] QR available, fetching...');
        try {
          const qrRes = await bridgeFetch('/qr', { method: 'GET' }, 8_000);
          console.log('[refreshQr] QR response ok?', qrRes.ok, 'status:', qrRes.status);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            console.log('[refreshQr] QR data length:', qrData.qr?.length || 0);
            if (qrData.qr && typeof qrData.qr === 'string') {
              console.log('[refreshQr] Setting QR image and showing modal');
              setQr(qrData.qr);
              setShowQRModal(true);
              return;
            }
          } else {
            console.warn('[refreshQr] QR response not ok');
          }
        } catch (qrErr) {
          console.warn('[refreshQr] Failed to fetch /qr:', qrErr);
        }
      }
      
      // Fallback: check if /status returns inline QR
      if (typeof data.qr === 'string' && data.qr.length > 0) {
        console.log('[refreshQr] QR found in status, setting it');
        setQr(data.qr);
        setShowQRModal(true);
        return;
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
                <span>⊕</span> New
              </button>

              {/* Login Button - Green (when disconnected) */}
              {status !== 'connected' && (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1"
                  title="Login with QR"
                >
                  {connecting ? '⟳' : '↑'} Login
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
              <span>+</span>
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
              .filter((chat) =>
                chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              // Sort: selected chat first, then by timestamp
              .sort((a, b) => {
                const aIsSelected = selectedChat && 
                  (typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized) ===
                  (typeof a.id === 'string' ? a.id : a.id._serialized);
                const bIsSelected = selectedChat && 
                  (typeof selectedChat.id === 'string' ? selectedChat.id : selectedChat.id._serialized) ===
                  (typeof b.id === 'string' ? b.id : b.id._serialized);
                
                if (aIsSelected && !bIsSelected) return -1;
                if (!aIsSelected && bIsSelected) return 1;
                return 0;
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
                      
                      {/* Phone number - second line */}
                      {(chat.displayName || chat.name) && /^\d+$/.test(String(chat.name)) && (
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
                              ID: {chat.leadId.toString().slice(-6)}
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
                <div className="flex-1 cursor-pointer" onClick={() => !selectedChat.isGroup && loadContactDetails(selectedChat.id)}>
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
                          ID: {activeLeadId.slice(-6)}
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
                className="text-slate-500 hover:text-slate-800 text-xl leading-none"
                aria-label="Close chat"
              >
                ×
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
                              <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                                <video
                                  src={mediaUrl}
                                  className="w-full h-auto max-w-xs rounded-lg"
                                  controls
                                  onError={(e) => {
                                    console.error('[video] Load error:', mediaUrl);
                                    const parent = (e.target as HTMLVideoElement).parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="bg-slate-200 rounded p-4 text-center text-slate-600">📹 Video failed to load</div>';
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {isPDF && (
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <span className="text-xl">📄</span>
                                <span className="text-sm truncate">Open PDF</span>
                              </a>
                            )}

                            {!isImage && !isVideo && !isPDF && mediaUrl && (
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <span className="text-xl">📎</span>
                                <span className="text-sm truncate">{msg.body || 'Download'}</span>
                              </a>
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

            {/* Message Input */}
            <div className="border-t border-slate-200 p-2 md:p-3 bg-[#f0f2f5]">
              <div className="flex gap-1 md:gap-2 items-end">
                {/* Media/Tools Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                    className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0"
                    title="Attach media"
                  >
                    +
                  </button>
                  
                  {/* Media Menu Dropdown */}
                  {showMediaMenu && (
                    <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border border-slate-200 min-w-max z-40">
                      <button
                        onClick={() => {
                          mediaInputRef.current?.click();
                          setShowMediaMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors first:rounded-t-lg"
                      >
                        <span className="text-xl">🖼️</span> Photos & Videos
                      </button>
                      <button
                        onClick={() => {
                          mediaInputRef.current?.click();
                          setShowMediaMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xl">📄</span> Document
                      </button>
                      <button
                        onClick={() => {
                          mediaInputRef.current?.click();
                          setShowMediaMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xl">🎤</span> Audio
                      </button>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={() => setShowMediaMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xl">👥</span> Contact
                      </button>
                      <button
                        onClick={() => setShowMediaMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xl">📍</span> Location
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
                  disabled={uploadingMedia}
                />

                {/* Message Input Area with Quick Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {/* Media Button */}
                    <button
                      onClick={() => setShowMediaMenu(!showMediaMenu)}
                      className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0 relative"
                      title="Attach media"
                    >
                      📎
                    </button>

                    {/* Quick Reply Button */}
                    <button
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0"
                      title="Quick replies"
                    >
                      ⚡
                    </button>

                    {/* Template Button */}
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0"
                      title="Message templates"
                    >
                      📋
                    </button>

                    {/* Schedule Button */}
                    <button
                      onClick={() => setShowSchedulePanel(!showSchedulePanel)}
                      className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0"
                      title="Schedule or delay message"
                    >
                      ⏰
                    </button>

                    {/* Emoji Picker */}
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 md:p-2 rounded-full hover:bg-slate-200 text-slate-600 text-lg md:text-xl transition-colors flex-shrink-0"
                      title="Emoji picker"
                    >
                      😊
                    </button>

                    {/* Message Input */}
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && e.ctrlKey && handleScheduledSend()}
                      placeholder="Type a message... (Ctrl+Enter to send)"
                      className="flex-1 px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                      disabled={sending || status !== 'connected'}
                      rows={8}
                    />

                    {/* Send Button */}
                    <button
                      onClick={handleScheduledSend}
                      disabled={sending || !newMessage.trim() || status !== 'connected' || uploadingMedia}
                      className="p-1.5 md:p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold transition-all text-lg md:text-xl flex-shrink-0"
                      title={uploadingMedia ? 'Uploading...' : 'Send message'}
                    >
                      {sending || uploadingMedia ? '⟳' : '➤'}
                    </button>
                  </div>

                  {/* Quick Replies Panel */}
                  {showQuickReplies && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-slate-900">Quick Replies</h3>
                        <button
                          onClick={() => setShowQuickReplies(false)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Quick Reply List */}
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {quickReplies.map((reply) => (
                          <div key={reply.id} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded">
                            <button
                              onClick={() => insertQuickReply(reply.message)}
                              className="flex-1 text-left text-sm text-slate-700 hover:bg-emerald-100 px-2 py-1 rounded truncate"
                            >
                              {reply.message}
                            </button>
                            <button
                              onClick={() => deleteQuickReply(reply.id)}
                              className="text-xs text-red-600 hover:text-red-800 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Quick Reply */}
                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          value={newQuickReply}
                          onChange={(e) => setNewQuickReply(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addQuickReply()}
                          placeholder="Add new quick reply..."
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={addQuickReply}
                          className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Templates Panel */}
                  {showTemplates && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-slate-900">Message Templates</h3>
                        <button
                          onClick={() => setShowTemplates(false)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Templates List */}
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {templates.map((template) => (
                          <div key={template.id} className="bg-slate-50 p-2 rounded">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-medium text-xs text-emerald-700">{template.name}</span>
                              <button
                                onClick={() => deleteTemplate(template.id)}
                                className="text-xs text-red-600 hover:text-red-800 flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                            <button
                              onClick={() => insertTemplate(template.message)}
                              className="w-full text-left text-xs text-slate-700 bg-white hover:bg-emerald-100 px-2 py-1 rounded border border-slate-200 truncate"
                            >
                              {template.message}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Template */}
                      {!showTemplateForm ? (
                        <button
                          onClick={() => setShowTemplateForm(true)}
                          className="w-full py-2 text-xs text-emerald-600 border-t border-slate-200 hover:bg-emerald-50 rounded mt-2"
                        >
                          + Add Template
                        </button>
                      ) : (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <input
                            type="text"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            placeholder="Template name (e.g., Welcome)"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <textarea
                            value={newTemplate.message}
                            onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                            placeholder="Template message..."
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            rows={8}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={addTemplate}
                              className="flex-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShowTemplateForm(false)}
                              className="flex-1 px-2 py-1 bg-slate-300 text-slate-700 text-xs rounded hover:bg-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schedule & Delay Panel */}
                  {showSchedulePanel && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-slate-900">Schedule & Delay</h3>
                        <button
                          onClick={() => setShowSchedulePanel(false)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Send Now vs Delay Tabs */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setUseSchedule(false); setUseDelay(false); }}
                          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                            !useSchedule && !useDelay
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Send Now
                        </button>
                        <button
                          onClick={() => { setUseDelay(true); setUseSchedule(false); }}
                          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                            useDelay
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Delay
                        </button>
                        <button
                          onClick={() => { setUseSchedule(true); setUseDelay(false); }}
                          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                            useSchedule
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Schedule
                        </button>
                      </div>

                      {/* Delay Controls */}
                      {useDelay && (
                        <div className="bg-slate-50 p-2 rounded space-y-2">
                          <p className="text-xs text-slate-700 font-medium">Delay time</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-slate-600">Days</label>
                              <input
                                type="number"
                                min="0"
                                value={delayDays}
                                onChange={(e) => setDelayDays(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Hours</label>
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={delayHours}
                                onChange={(e) => setDelayHours(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Minutes</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={delayMinutes}
                                onChange={(e) => setDelayMinutes(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Seconds</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={delaySeconds}
                                onChange={(e) => setDelaySeconds(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Schedule Controls */}
                      {useSchedule && (
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-xs text-slate-700 font-medium mb-2">Schedule date & time</p>
                          <input
                            type="datetime-local"
                            value={scheduleDateTime}
                            onChange={(e) => setScheduleDateTime(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress Indicators */}
              {uploadingMedia && Object.keys(uploadProgress).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="text-xs text-slate-600">
                      <div className="flex items-center justify-between mb-1">
                        <span className="truncate">{fileId.split('-').slice(0, -1).join('-')}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div
                          className="bg-emerald-600 h-1 rounded-full transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadingMedia && Object.keys(uploadProgress).length === 0 && (
                <div className="mt-2 text-xs text-slate-600 animate-pulse">
                  📤 Uploading media...
                </div>
              )}              {/* Emoji Picker Grid */}
              {showEmojiPicker && (
                <div className="mt-2 grid grid-cols-8 gap-1 bg-white p-2 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                  {['😊', '😂', '🥰', '😍', '🎉', '🎊', '🔥', '👍', '❤️', '😢', '😡', '🤔', '👏', '🙌', '💪', '🚀', '⭐', '✨', '💯', '🎈', '🎁', '🌟', '💝', '😎', '🤗', '😘', '😌', '😴', '🤗', '😷', '🥳', '💕'].map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
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
              ×
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
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  {getInitials(contactDetails.name)}
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
                ×
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
