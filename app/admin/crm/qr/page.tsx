'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, Phone, PhoneCall, Send, Image as ImageIcon, FileText, Mic, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Unplug, Funnel, Plus, Tag, CheckSquare, Square, X, Paperclip, Video, File, Pencil, Trash2, Users, Mail, MailOpen, Radio, Info, Shield, Crown, Calendar, MessageSquare, Hash, UserCircle, PhoneOff, Search, Star, Bold, Italic, Strikethrough, Smile, Zap, Type, Link2, Copy, RotateCcw, Lock, Unlock, UserMinus, ChevronUp, ChevronDown, Save, Settings, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type BridgeStatus = {
  connected: boolean;
  status: ConnectionStatus;
  phone?: { id: string; name: string } | null;
  qrAvailable?: boolean;
  retryCount?: number;
  uptime?: number;
};

type QRResponse = {
  connected: boolean;
  qr: string | null;
  qrString?: string;
  message?: string;
};

// Format phone number to readable format
const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  // LID internal IDs are 14+ digits — NOT phone numbers, don't format them
  if (cleaned.length >= 14) return phone;
  // Indian numbers
  if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  if (cleaned.length === 13 && cleaned.startsWith('91')) return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  // Other international numbers — add + prefix and space after country code
  if (cleaned.length >= 11 && cleaned.length <= 13) return `+${cleaned}`;
  // Fallback
  return phone;
};

// Get avatar color based on name/id
const getAvatarColor = (name: string): string => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Convert URLs in text to clickable links
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
const linkifyText = (text: string): React.ReactNode[] => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all">{part}</a>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

// Funnel color palette for new stages
const FUNNEL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-300',
  'bg-green-50 text-green-700 border-green-300',
  'bg-red-50 text-red-700 border-red-300',
  'bg-purple-50 text-purple-700 border-purple-300',
  'bg-yellow-50 text-yellow-700 border-yellow-300',
  'bg-orange-50 text-orange-700 border-orange-300',
  'bg-pink-50 text-pink-700 border-pink-300',
  'bg-teal-50 text-teal-700 border-teal-300',
  'bg-cyan-50 text-cyan-700 border-cyan-300',
  'bg-indigo-50 text-indigo-700 border-indigo-300',
];

// Label color palette for new labels
const LABEL_COLORS = [
  'bg-amber-100 text-amber-800',
  'bg-cyan-100 text-cyan-800',
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-indigo-100 text-indigo-800',
  'bg-pink-100 text-pink-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-lime-100 text-lime-800',
  'bg-sky-100 text-sky-800',
];

// Common emoji grid for quick picker
const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
  '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
  '🤔','🤫','🤭','😏','😌','😔','😪','🤤','😴','🤧',
  '🙏','👍','👎','👏','🤝','✌️','🤞','❤️','🔥','⭐',
  '💯','✅','❌','⚠️','📌','🎯','💪','🏆','🎉','🙌',
  '👋','🤙','📞','📱','💬','📝','📅','🕐','💰','🧘',
];

// Quick reply presets
const QUICK_REPLIES = [
  'Thank you for your interest! 🙏',
  'Please share your details.',
  'Our classes start at 6 AM and 7 PM.',
  'Visit swaryoga.com for more info.',
  'I will get back to you shortly.',
  'Namaste! How can I help you? 🙏',
  'Would you like to join a free demo class?',
  'Payment received. Thank you! ✅',
];

// Template presets
const TEMPLATES = [
  { name: '🙏 Welcome', text: 'Welcome to Swar Yoga! 🙏 We are glad to have you. Our classes are available online and offline. Visit swaryoga.com for details.' },
  { name: '📞 Follow Up', text: 'Hi! Just checking in. Would you like to know more about our yoga programs? Feel free to ask any questions.' },
  { name: '💰 Payment Reminder', text: 'Gentle reminder: Your payment is due. Please complete it at your earliest convenience. Thank you! 🙏' },
  { name: '📅 Class Schedule', text: 'Our class schedule:\n🌅 Morning: 6:00 AM - 7:00 AM\n🌙 Evening: 7:00 PM - 8:00 PM\n\nJoin us! 🧘' },
  { name: '🎉 Special Offer', text: 'Special offer! Enroll now and get 20% off on our annual yoga program. Limited time only! 🎯' },
];

type FunnelStage = { key: string; label: string; color: string };
type LabelPreset = { key: string; label: string; color: string };

const DEFAULT_FUNNEL_STAGES: FunnelStage[] = [
  { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { key: 'new_lead', label: 'New Lead', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { key: 'contacted', label: 'Contacted', color: 'bg-sky-50 text-sky-700 border-sky-300' },
  { key: 'interested', label: 'Interested', color: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
  { key: 'demo_trial', label: 'Demo / Trial', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'enrolled', label: 'Enrolled', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { key: 'completed', label: 'Completed', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  { key: 'inactive', label: 'Inactive', color: 'bg-gray-50 text-gray-600 border-gray-300' },
  { key: 'repeater', label: 'Repeater', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { key: 'old_sadhak', label: 'Old Sadhak', color: 'bg-teal-50 text-teal-700 border-teal-300' },
  { key: 'only_for_post', label: 'Only for Post', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
];

const DEFAULT_LABEL_PRESETS: LabelPreset[] = [
  { key: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-800' },
  { key: 'follow_up', label: 'Follow Up', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { key: 'new', label: 'New', color: 'bg-indigo-100 text-indigo-800' },
];

type ChatItem = {
  id: string;
  name: string;
  isGroup: boolean;
  isLid?: boolean;
  resolvedPhone?: string;
  unreadCount: number;
  lastMessageTime: string | null;
  lastMessage?: string;
  funnelStage?: string;
  labels?: string[];
};

type MessageItem = {
  id: string;
  from: string;
  fromMe: boolean;
  text: string;
  type: string;
  timestamp: number;
  status: number;
  participant?: string;
  pushName?: string;
  hasMedia?: boolean;
  mediaUrl?: string | null;
  mediaMimetype?: string | null;
  mediaFileName?: string | null;
};

type ChatFilter = 'all' | 'unread' | 'read' | 'groups';

type GroupParticipant = { id: string; lid?: string; admin: 'admin' | 'superadmin' | null };
type GroupInfo = {
  id: string; subject: string; subjectOwner?: string;
  desc: string; owner?: string; creation?: number;
  size: number; participants: GroupParticipant[];
  announce?: boolean; restrict?: boolean;
};

export default function QRWhatsAppPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // State
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'status' | 'inbox'>('status');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [downloadingExtension, setDownloadingExtension] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeFunnel, setActiveFunnel] = useState<string>('all');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkFunnel, setShowBulkFunnel] = useState(false);
  const [showBulkLabel, setShowBulkLabel] = useState(false);
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [chatFunnels, setChatFunnels] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') { try { const v = localStorage.getItem('crm_chatFunnels'); if (v) return JSON.parse(v); } catch {} } return {};
  });
  const [chatLabels, setChatLabels] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') { try { const v = localStorage.getItem('crm_chatLabels'); if (v) return JSON.parse(v); } catch {} } return {};
  });
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>(DEFAULT_FUNNEL_STAGES);
  const [labelPresets, setLabelPresets] = useState<LabelPreset[]>(DEFAULT_LABEL_PRESETS);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [editModal, setEditModal] = useState<{ type: 'funnel' | 'label'; mode: 'add' | 'edit'; item?: FunnelStage | LabelPreset } | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ file: File; base64: string; type: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsPanel, setDetailsPanel] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [downloadingMedia, setDownloadingMedia] = useState<string | null>(null);
  // Group management state
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [groupInviteLink, setGroupInviteLink] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [groupSettingsLoading, setGroupSettingsLoading] = useState<string | null>(null);
  // Status/stories state
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [selectedStatusUser, setSelectedStatusUser] = useState<any>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  // Chat toolbar state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // Star popup state
  const [showStarPopup, setShowStarPopup] = useState(false);
  const [starTab, setStarTab] = useState<'quick' | 'template' | 'broadcast'>('quick');
  const [broadcastChats, setBroadcastChats] = useState<Set<string>>(new Set());
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const profilePicLoadedRef = useRef<Set<string>>(new Set());
  const messengerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // ── Load QR settings (funnel stages, labels, chat mappings) from MongoDB on mount ──
  // All QR funnel/label data is stored independently in crm_user_settings (NOT shared funnel_configs)
  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dbLoadedRef = useRef(false);

  // Direct save function using ref to avoid stale closure issues
  const crmFetchRef = useRef(crmFetch);
  crmFetchRef.current = crmFetch;

  // Accumulate pending updates so rapid state changes merge into one PUT
  const pendingUpdatesRef = useRef<Record<string, any>>({});

  const saveToMongoDB = useCallback((updates: Record<string, any>) => {
    // Merge into pending updates (so chatFunnels + qrFunnelStages + etc. all go in one PUT)
    Object.assign(pendingUpdatesRef.current, updates);
    if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = setTimeout(async () => {
      const merged = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      try {
        console.log('[QR] Saving to MongoDB:', Object.keys(merged));
        await crmFetchRef.current('/api/admin/crm/settings', {
          method: 'PUT',
          body: merged,
          silent: true,
        });
        console.log('[QR] ✅ Saved to MongoDB:', Object.keys(merged));
      } catch (e) {
        console.warn('[QR] ❌ Failed to save to MongoDB:', e);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadFromDB = async () => {
      try {
        // Load ALL QR settings from crm_user_settings (independent from leads/manage funnel)
        const settingsRes = await crmFetch('/api/admin/crm/settings', { silent: true });
        if (!cancelled && settingsRes) {
          // Load QR-specific funnel stages
          if (settingsRes.qrFunnelStages?.length > 0) {
            const allStage: FunnelStage = { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300' };
            const loaded: FunnelStage[] = settingsRes.qrFunnelStages
              .filter((s: any) => s.key !== 'all')
              .map((s: any) => ({ key: s.key, label: s.label, color: s.color }));
            setFunnelStages([allStage, ...loaded]);
          }
          // Load chat-to-funnel mappings
          if (settingsRes.chatFunnels && Object.keys(settingsRes.chatFunnels).length > 0) {
            setChatFunnels(settingsRes.chatFunnels);
          }
          // Load chat-to-label mappings
          if (settingsRes.chatLabels && Object.keys(settingsRes.chatLabels).length > 0) {
            setChatLabels(settingsRes.chatLabels);
          }
          // Load label presets
          if (settingsRes.labelPresets?.length > 0) {
            setLabelPresets(settingsRes.labelPresets);
          }
          console.log('[QR] ✅ Loaded settings from MongoDB — funnels:', settingsRes.qrFunnelStages?.length || 0, 'chatFunnels:', Object.keys(settingsRes.chatFunnels || {}).length, 'chatLabels:', Object.keys(settingsRes.chatLabels || {}).length, 'labels:', settingsRes.labelPresets?.length || 0);
        }
      } catch (e) {
        console.warn('[QR] Failed to load CRM settings, using localStorage cache:', e);
      }

      if (!cancelled) {
        dbLoadedRef.current = true;
        setDbLoaded(true);
      }
    };

    loadFromDB();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Auto-save to localStorage (cache) + MongoDB ──
  useEffect(() => {
    try { localStorage.setItem('crm_chatFunnels', JSON.stringify(chatFunnels)); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ chatFunnels });
  }, [chatFunnels, saveToMongoDB]);
  useEffect(() => {
    try { localStorage.setItem('crm_chatLabels', JSON.stringify(chatLabels)); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ chatLabels });
  }, [chatLabels, saveToMongoDB]);
  useEffect(() => {
    try { localStorage.setItem('crm_funnelStages', JSON.stringify(funnelStages)); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ qrFunnelStages: funnelStages.filter(s => s.key !== 'all') });
  }, [funnelStages, saveToMongoDB]);
  useEffect(() => {
    try { localStorage.setItem('crm_labelPresets', JSON.stringify(labelPresets)); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ labelPresets });
  }, [labelPresets, saveToMongoDB]);

  // ── Bridge API calls via CRM proxy ──
  const bridgeCall = useCallback(async (path: string, method = 'GET', body?: any) => {
    try {
      if (method === 'GET') {
        const res = await crmFetch('/api/admin/crm/whatsapp/qr-bridge', {
          params: { path },
        });
        return res;
      } else {
        const res = await crmFetch('/api/admin/crm/whatsapp/qr-bridge', {
          method: 'POST',
          body: { action: method, path, body },
        });
        return res;
      }
    } catch (e: any) {
      // Handle bridge timeout/unreachable gracefully
      const msg = e?.message || String(e);
      if (msg.includes('timeout') || msg.includes('504')) {
        throw new Error('Bridge unreachable — is the Baileys service running?');
      }
      if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
        throw new Error('Cannot reach WhatsApp bridge — make sure it is running on port 3333');
      }
      throw e;
    }
  }, [crmFetch]);

  // ── Poll status ──
  const fetchStatus = useCallback(async () => {
    try {
      const data = await bridgeCall('/status');
      setStatus(data);
      setError(null);

      if (data?.connected) {
        // Connected — clear QR
        setQrData(null);
        // Auto-switch to inbox
        if (tab === 'status') {
          setTab('inbox');
          fetchChats();
        }
      } else if (data?.qrAvailable) {
        // QR available — fetch it (keep old QR showing during refresh)
        try {
          const qr = await bridgeCall('/qr');
          if (qr?.qr) setQrData(qr.qr);
        } catch {
          // Keep existing QR if fetch fails
        }
      }
      // Don't clear QR when status is briefly 'disconnected' during reconnect
    } catch (e: any) {
      // Don't clear QR on network errors — keep showing it
      setError(e.message || 'Cannot reach WhatsApp bridge');
      setStatus(prev => prev || { connected: false, status: 'disconnected' });
    } finally {
      setLoading(false);
    }
  }, [bridgeCall, tab]);

  // ── Poll setup ──
  useEffect(() => {
    if (!token) return;
    fetchStatus();
    // Poll less aggressively: 15s when connected, 6s when waiting for QR
    const interval = status?.connected ? 15000 : 6000;
    pollRef.current = setInterval(fetchStatus, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, fetchStatus, status?.connected]);

  // ── Fetch profile picture for a JID ──
  const fetchProfilePic = useCallback(async (jid: string) => {
    if (profilePicLoadedRef.current.has(jid)) return;
    profilePicLoadedRef.current.add(jid);
    try {
      const data = await bridgeCall(`/profile-pic/${encodeURIComponent(jid)}`);
      if (data?.url) {
        setProfilePics(prev => ({ ...prev, [jid]: data.url }));
      }
    } catch {}
  }, [bridgeCall]);

  // ── Fetch chats ──
  const fetchChats = useCallback(async () => {
    try {
      const data = await bridgeCall('/chats');
      if (data?.chats) {
        // Deduplicate: merge LID and phone JIDs for the same contact
        const phoneMap = new Map<string, ChatItem>();
        const deduped: ChatItem[] = [];
        for (const c of data.chats as ChatItem[]) {
          if (c.isGroup) {
            deduped.push(c);
            continue;
          }
          // Extract phone from resolvedPhone, name, or JID
          const phone = c.resolvedPhone
            || (c.id.endsWith('@s.whatsapp.net') ? c.id.split('@')[0] : null)
            || (/^\d{10,13}$/.test(c.name) ? c.name : null);
          if (phone && phoneMap.has(phone)) {
            // Merge: keep the entry with more recent message, combine unread counts
            const existing = phoneMap.get(phone)!;
            const eTime = existing.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0;
            const cTime = c.lastMessageTime ? new Date(c.lastMessageTime).getTime() : 0;
            if (cTime > eTime) {
              // current chat is newer — replace but merge unread
              c.unreadCount = (c.unreadCount || 0) + (existing.unreadCount || 0);
              phoneMap.set(phone, c);
              const idx = deduped.indexOf(existing);
              if (idx >= 0) deduped[idx] = c;
            } else {
              existing.unreadCount = (existing.unreadCount || 0) + (c.unreadCount || 0);
            }
          } else {
            if (phone) phoneMap.set(phone, c);
            deduped.push(c);
          }
        }
        const sorted = deduped.sort((a, b) => {
          const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return tb - ta;
        });
        setChats(sorted);
        setError(null);
        // Lazy-load profile pictures for visible chats (groups + individuals)
        sorted.slice(0, 30).forEach((c: ChatItem) => fetchProfilePic(c.id));
      }
    } catch (e: any) {
      console.error('Failed to fetch chats:', e);
      setError(e?.message || 'Failed to fetch chats');
    }
  }, [bridgeCall, fetchProfilePic]);

  // ── Auto-refresh chat list every 15s when connected & on inbox tab ──
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (tab === 'inbox' && status?.connected) {
      chatPollRef.current = setInterval(fetchChats, 15000);
    } else {
      if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; }
    }
    return () => { if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; } };
  }, [tab, status?.connected, fetchChats]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (jid: string) => {
    try {
      const data = await bridgeCall(`/messages/${jid}`);
      if (data?.messages) {
        setMessages(data.messages);
        setTimeout(() => {
          messengerRef.current?.scrollTo({ top: messengerRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  }, [bridgeCall]);

  // ── Auto-refresh messages every 8s for active conversation ──
  const msgPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (selectedChat && status?.connected) {
      msgPollRef.current = setInterval(() => fetchMessages(selectedChat), 8000);
    } else {
      if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; }
    }
    return () => { if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; } };
  }, [selectedChat, status?.connected, fetchMessages]);

  // ── Fetch group info ──
  const fetchGroupInfo = useCallback(async (jid: string) => {
    setLoadingGroupInfo(true);
    try {
      const data = await bridgeCall(`/group-info/${encodeURIComponent(jid)}`);
      setGroupInfo(data);
    } catch (e) {
      console.error('Failed to fetch group info:', e);
      setGroupInfo(null);
    } finally {
      setLoadingGroupInfo(false);
    }
  }, [bridgeCall]);

  // ── Open details panel ──
  const openDetailsPanel = useCallback((jid: string) => {
    setDetailsPanel(true);
    setGroupInviteLink(null);
    setEditingDesc(false);
    const isGroup = jid.endsWith('@g.us') || jid.endsWith('@lid');
    if (isGroup) {
      fetchGroupInfo(jid);
    } else {
      setGroupInfo(null);
    }
  }, [fetchGroupInfo]);

  // ── Group admin helpers ──
  const updateGroupDesc = useCallback(async () => {
    if (!selectedChat || savingDesc) return;
    setSavingDesc(true);
    try {
      await bridgeCall(`/group-update-desc/${encodeURIComponent(selectedChat)}`, 'POST', { description: editDescText });
      // Refresh group info
      await fetchGroupInfo(selectedChat);
      setEditingDesc(false);
    } catch (e: any) {
      setError(e.message || 'Failed to update description');
    } finally {
      setSavingDesc(false);
    }
  }, [selectedChat, editDescText, savingDesc, bridgeCall, fetchGroupInfo]);

  const fetchGroupInvite = useCallback(async () => {
    if (!selectedChat || loadingInvite) return;
    setLoadingInvite(true);
    try {
      const data = await bridgeCall(`/group-invite/${encodeURIComponent(selectedChat)}`);
      setGroupInviteLink(data?.link || null);
    } catch (e: any) {
      setError(e.message || 'Failed to get invite link');
    } finally {
      setLoadingInvite(false);
    }
  }, [selectedChat, loadingInvite, bridgeCall]);

  const revokeGroupInvite = useCallback(async () => {
    if (!selectedChat) return;
    if (!confirm('Revoke the current invite link? Anyone with the old link won\u2019t be able to join.')) return;
    try {
      const data = await bridgeCall(`/group-revoke-invite/${encodeURIComponent(selectedChat)}`, 'POST');
      setGroupInviteLink(data?.link || null);
    } catch (e: any) {
      setError(e.message || 'Failed to revoke');
    }
  }, [selectedChat, bridgeCall]);

  const updateGroupSetting = useCallback(async (setting: string) => {
    if (!selectedChat || groupSettingsLoading) return;
    setGroupSettingsLoading(setting);
    try {
      await bridgeCall(`/group-settings/${encodeURIComponent(selectedChat)}`, 'POST', { setting });
      await fetchGroupInfo(selectedChat);
    } catch (e: any) {
      setError(e.message || 'Failed to update settings');
    } finally {
      setGroupSettingsLoading(null);
    }
  }, [selectedChat, groupSettingsLoading, bridgeCall, fetchGroupInfo]);

  const updateGroupParticipant = useCallback(async (participantJid: string, action: 'promote' | 'demote' | 'remove') => {
    if (!selectedChat) return;
    const actionLabel = action === 'remove' ? 'Remove this member?' : action === 'promote' ? 'Make admin?' : 'Remove admin?';
    if (!confirm(actionLabel)) return;
    try {
      await bridgeCall(`/group-participants/${encodeURIComponent(selectedChat)}`, 'POST', { action, participants: [participantJid] });
      await fetchGroupInfo(selectedChat);
    } catch (e: any) {
      setError(e.message || `Failed to ${action}`);
    }
  }, [selectedChat, bridgeCall, fetchGroupInfo]);

  // ── Fetch statuses/stories ──
  const fetchStatuses = useCallback(async () => {
    setLoadingStatuses(true);
    try {
      const data = await bridgeCall('/statuses');
      setStatusData(data.statuses || []);
    } catch (e: any) {
      console.error('Failed to fetch statuses:', e);
      setStatusData([]);
    } finally {
      setLoadingStatuses(false);
    }
  }, [bridgeCall]);

  // ── Select chat ──
  const selectChat = useCallback((jid: string) => {
    setSelectedChat(jid);
    setDetailsPanel(false);
    setGroupInfo(null);
    fetchMessages(jid);
    fetchProfilePic(jid);
  }, [fetchMessages, fetchProfilePic]);

  // ── Handle file selection for media ──
  const handleFileSelect = useCallback((accept: string) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  }, []);

  const onFileChosen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview({ file, base64: reader.result as string, type: file.type });
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }, []);

  // ── Send message (text or media) ──
  const handleSend = useCallback(async () => {
    if ((!composerText.trim() && !mediaPreview) || !selectedChat || sending) return;
    setSending(true);
    try {
      // For groups, send using the full JID; for individuals, strip the suffix
      const isGroupChat = selectedChat.endsWith('@g.us') || selectedChat.endsWith('@lid');
      const to = isGroupChat ? selectedChat : selectedChat.replace('@s.whatsapp.net', '');
      if (mediaPreview) {
        // Upload to Bunny Storage first (CDN URL approach, like Meta API)
        // This avoids sending huge base64 payloads through Vercel's body size limit
        let bunnyUrl: string | null = null;
        try {
          const formData = new FormData();
          formData.append('file', mediaPreview.file);
          formData.append('chatId', selectedChat);
          const uploadRes = await fetch('/api/admin/crm/media/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            bunnyUrl = uploadData?.data?.url || null;
          }
        } catch (e) {
          console.warn('[QR] Bunny upload skipped:', e);
        }

        if (bunnyUrl) {
          // Send CDN URL to bridge — bridge downloads and sends to WhatsApp
          // This is the Meta API approach: upload first, send URL
          // Avoids Vercel's ~4.5MB body limit for serverless functions
          await bridgeCall('/send', 'POST', {
            to,
            type: 'media',
            media: bunnyUrl,
            mimetype: mediaPreview.type,
            caption: composerText.trim() || '',
            fileName: mediaPreview.file.name,
            cdnUrl: bunnyUrl,
          });
        } else {
          // Fallback: send base64 directly (only works for files < ~3MB)
          await bridgeCall('/send', 'POST', {
            to,
            type: 'media',
            media: mediaPreview.base64,
            mimetype: mediaPreview.type,
            caption: composerText.trim() || '',
            fileName: mediaPreview.file.name,
          });
        }
        setMediaPreview(null);
      } else {
        // Send text
        await bridgeCall('/send', 'POST', {
          to,
          message: composerText.trim(),
          type: 'text',
        });
      }
      const hadMedia = !!mediaPreview;
      setComposerText('');
      // Refresh messages — longer delay for media (webhook needs time to upload & set CDN URL)
      setTimeout(() => fetchMessages(selectedChat), hadMedia ? 1500 : 500);
      // Double-refresh for media to catch async CDN URL updates from webhook
      if (hadMedia) setTimeout(() => fetchMessages(selectedChat), 4000);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [composerText, mediaPreview, selectedChat, sending, bridgeCall, fetchMessages, token]);

  // ── Download media from bridge via server-side proxy (avoids CORS) ──
  const downloadMediaFromBridge = useCallback(async (messageId: string, fileName?: string) => {
    try {
      setDownloadingMedia(messageId);
      // Route through our own API to avoid CORS issues with the bridge
      const proxyUrl = `/api/admin/crm/media/bridge-download?messageId=${encodeURIComponent(messageId)}&token=${encodeURIComponent(token || '')}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `media_${messageId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(`Failed to download media: ${e.message}`);
    } finally {
      setDownloadingMedia(null);
    }
  }, [token]);

  // ── Reconnect (with debounce to prevent spam) ──
  const reconnectingRef = useRef(false);
  const handleReconnect = useCallback(async () => {
    if (reconnectingRef.current) return; // prevent double-click
    reconnectingRef.current = true;
    try {
      setLoading(true);
      await bridgeCall('/reconnect', 'POST');
      setTimeout(fetchStatus, 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTimeout(() => { reconnectingRef.current = false; }, 5000);
    }
  }, [bridgeCall, fetchStatus]);

  // ── Disconnect (keep auth, close socket) ──
  const handleDisconnect = useCallback(async () => {
    if (!confirm('Disconnect WhatsApp? You can reconnect without scanning QR again.')) return;
    try {
      await bridgeCall('/disconnect', 'POST');
      setStatus({ connected: false, status: 'disconnected' });
      setTab('status');
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      setTimeout(fetchStatus, 2000);
    } catch (e: any) {
      setError(e.message);
    }
  }, [bridgeCall, fetchStatus]);

  // ── Logout (clears auth, must scan QR again) ──
  const handleLogout = useCallback(async () => {
    if (!confirm('Logout completely? You will need to scan QR again.')) return;
    try {
      await bridgeCall('/logout', 'POST');
      setStatus({ connected: false, status: 'disconnected' });
      setTab('status');
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      setTimeout(fetchStatus, 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }, [bridgeCall, fetchStatus]);

  // ── Download Installer ──
  const handleDownloadInstaller = useCallback(async () => {
    setDownloadingExtension(true);
    try {
      // First download the installer script
      const response = await fetch('/api/admin/crm/whatsapp/download-installer');
      if (!response.ok) throw new Error('Failed to download installer');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'install.sh';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      // Show install guide after download
      setTimeout(() => {
        setShowInstallGuide(true);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to download installer');
    } finally {
      setDownloadingExtension(false);
    }
  }, []);

  // ── Toggle chat selection ──
  const toggleChatSelection = useCallback((chatId: string) => {
    setSelectedChats(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  // ── Select all visible chats ──
  const selectAllChats = useCallback(() => {
    const filtered = chats.filter(c => activeFunnel === 'all' || chatFunnels[c.id] === activeFunnel);
    if (selectedChats.size === filtered.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(filtered.map(c => c.id)));
    }
  }, [chats, activeFunnel, chatFunnels, selectedChats]);

  // ── Assign funnel to selected chats ──
  const assignFunnel = useCallback((stage: string) => {
    setChatFunnels(prev => {
      const next = { ...prev };
      selectedChats.forEach(id => { next[id] = stage; });
      return next;
    });
    setSelectedChats(new Set());
    setSelectionMode(false);
    setShowBulkFunnel(false);
  }, [selectedChats]);

  // ── Assign label to selected chats ──
  const assignLabel = useCallback((label: string) => {
    setChatLabels(prev => {
      const next = { ...prev };
      selectedChats.forEach(id => {
        const existing = next[id] || [];
        if (!existing.includes(label)) next[id] = [...existing, label];
      });
      return next;
    });
    setSelectedChats(new Set());
    setSelectionMode(false);
    setShowBulkLabel(false);
  }, [selectedChats]);

  // ── Remove label from a single chat ──
  const removeChatLabel = useCallback((chatId: string, label: string) => {
    setChatLabels(prev => {
      const next = { ...prev };
      next[chatId] = (next[chatId] || []).filter(l => l !== label);
      return next;
    });
  }, []);

  // ── Funnel / Label CRUD ──
  const openEditModal = useCallback((type: 'funnel' | 'label', mode: 'add' | 'edit', item?: FunnelStage | LabelPreset) => {
    setEditName(mode === 'edit' && item ? item.label : '');
    setEditColor(mode === 'edit' && item ? item.color : (type === 'funnel' ? FUNNEL_COLORS[0] : LABEL_COLORS[0]));
    setEditModal({ type, mode, item });
  }, []);

  const saveEditModal = useCallback(() => {
    if (!editModal || !editName.trim()) return;
    const { type, mode, item } = editModal;
    if (type === 'funnel') {
      if (mode === 'add') {
        const key = editName.trim().toLowerCase().replace(/\s+/g, '_');
        if (funnelStages.some(s => s.key === key)) return;
        setFunnelStages(prev => [...prev, { key, label: editName.trim(), color: editColor }]);
      } else if (item) {
        setFunnelStages(prev => prev.map(s => s.key === item.key ? { ...s, label: editName.trim(), color: editColor } : s));
      }
    } else {
      if (mode === 'add') {
        const key = editName.trim().toLowerCase().replace(/\s+/g, '_');
        if (labelPresets.some(l => l.key === key)) return;
        setLabelPresets(prev => [...prev, { key, label: editName.trim(), color: editColor }]);
      } else if (item) {
        setLabelPresets(prev => prev.map(l => l.key === item.key ? { ...l, label: editName.trim(), color: editColor } : l));
      }
    }
    setEditModal(null);
  }, [editModal, editName, editColor, funnelStages, labelPresets]);

  const deleteFromModal = useCallback(() => {
    if (!editModal?.item) return;
    const { type, item } = editModal;
    if (type === 'funnel' && item.key !== 'all') {
      setFunnelStages(prev => prev.filter(s => s.key !== item.key));
      if (activeFunnel === item.key) setActiveFunnel('all');
    } else if (type === 'label') {
      setLabelPresets(prev => prev.filter(l => l.key !== item.key));
    }
    setEditModal(null);
  }, [editModal, activeFunnel]);

  // ── Filter chats by funnel + chatFilter + search ──
  const filteredChats = chats.filter(c => {
    // Apply funnel filter
    if (activeFunnel !== 'all' && chatFunnels[c.id] !== activeFunnel) return false;
    // Apply chat filter (read/unread/groups)
    switch (chatFilter) {
      case 'unread': if (c.unreadCount <= 0) return false; break;
      case 'read': if (c.unreadCount !== 0) return false; break;
      case 'groups': if (!c.isGroup) return false; break;
    }
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (c.name || '').toLowerCase();
      const phone = (c.resolvedPhone || c.id.split('@')[0] || '').toLowerCase();
      const lastMsg = (c.lastMessage || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !lastMsg.includes(q)) return false;
    }
    return true;
  });

  // ── Text formatting helper ──
  const applyFormat = useCallback((prefix: string, suffix: string) => {
    const input = composerInputRef.current;
    if (!input) { setComposerText(prev => prev + prefix + suffix); setShowFormatBar(false); return; }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = composerText;
    if (start !== end) {
      const selected = text.substring(start, end);
      setComposerText(text.substring(0, start) + prefix + selected + suffix + text.substring(end));
    } else {
      setComposerText(text.substring(0, start) + prefix + suffix + text.substring(start));
      setTimeout(() => { input.focus(); input.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
    }
    setShowFormatBar(false);
  }, [composerText]);

  // ── Broadcast send (send to multiple contacts at once) ──
  const handleBroadcastSend = useCallback(async () => {
    if (!broadcastText.trim() || broadcastChats.size === 0 || broadcastSending) return;
    setBroadcastSending(true);
    const chatIds = Array.from(broadcastChats);
    let sent = 0;
    for (const chatId of chatIds) {
      try {
        const isGroupChat = chatId.endsWith('@g.us') || chatId.endsWith('@lid');
        const to = isGroupChat ? chatId : chatId.replace('@s.whatsapp.net', '');
        await bridgeCall('/send', 'POST', { to, message: broadcastText.trim(), type: 'text' });
        sent++;
        if (sent < chatIds.length) await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error('Broadcast send failed for', chatId, e);
      }
    }
    setBroadcastSending(false);
    setBroadcastText('');
    setBroadcastChats(new Set());
    setShowStarPopup(false);
    alert(`✅ Message sent to ${sent}/${chatIds.length} contacts`);
  }, [broadcastText, broadcastChats, broadcastSending, bridgeCall]);

  // ── Close all composer popups ──
  const closeComposerPopups = useCallback(() => {
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    setShowFormatBar(false);
  }, []);

  // ── Render ──
  const connState = status?.status || 'disconnected';
  const isConnected = connState === 'connected';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Single-row header: status + tabs + funnel pills + actions */}
      <div className="bg-white border-b px-3 py-1 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
            isConnected ? 'bg-green-50 text-green-700' :
            connState === 'connecting' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            {isConnected ? <Wifi className="w-2.5 h-2.5" /> :
             connState === 'connecting' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
             <WifiOff className="w-2.5 h-2.5" />}
            <span>{isConnected ? 'Connected' : connState === 'connecting' ? '...' : 'Offline'}</span>
          </div>
          <div className="flex bg-gray-100 rounded p-0.5 gap-0.5">
            <button onClick={() => setTab('status')} className={`px-2 py-0.5 text-[10px] rounded transition ${tab === 'status' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Status</button>
            <button onClick={() => { setTab('inbox'); if (isConnected) fetchChats(); }} className={`px-2 py-0.5 text-[10px] rounded transition ${tab === 'inbox' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Inbox</button>
          </div>
        </div>
        {/* Inline funnel pills */}
        {tab === 'inbox' && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1">
            {funnelStages.map(stage => {
              const count = stage.key === 'all'
                ? chats.length
                : chats.filter(c => chatFunnels[c.id] === stage.key).length;
              return (
                <div key={stage.key} className="flex items-center flex-shrink-0 group">
                  <button
                    onClick={() => { setActiveFunnel(stage.key); setSelectedChats(new Set()); }}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap transition ${activeFunnel === stage.key ? stage.color + ' ring-1 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {stage.label}
                    <span className={`text-[9px] px-0.5 rounded-full ${activeFunnel === stage.key ? 'bg-white/60' : 'bg-gray-100'}`}>{count}</span>
                  </button>
                  {stage.key !== 'all' && (
                    <button onClick={() => openEditModal('funnel', 'edit', stage)} className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition" title="Edit">
                      <Pencil className="w-2 h-2 text-gray-400" />
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => openEditModal('funnel', 'add')} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 whitespace-nowrap transition flex-shrink-0" title="Add funnel stage">
              <Plus className="w-2.5 h-2.5" /> Add
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => { setShowStatusPanel(true); fetchStatuses(); }} className="px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200 flex items-center gap-0.5" title="View Statuses">
            <Eye className="w-3 h-3" /> Status
          </button>
          <button onClick={() => setShowExtensionModal(true)} className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200" title="Download">📥</button>
          {isConnected && (
            <>
              <button onClick={handleReconnect} className="p-0.5 rounded hover:bg-gray-100" title="Reconnect"><RefreshCw className="w-3 h-3 text-gray-500" /></button>
              <button onClick={handleDisconnect} className="p-0.5 rounded hover:bg-orange-50" title="Disconnect"><Unplug className="w-3 h-3 text-orange-500" /></button>
              <button onClick={handleLogout} className="p-0.5 rounded hover:bg-red-50" title="Logout"><LogOut className="w-3 h-3 text-red-500" /></button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-500">Connecting to WhatsApp bridge...</span>
        </div>
      )}

      {/* Status Tab */}
      {!loading && tab === 'status' && (
        <div className="max-w-2xl mx-auto mt-8 px-6">
          {/* QR Code — show whenever we have QR data and not connected */}
          {!isConnected && qrData && (
            <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Scan QR Code</h2>
                <button
                  onClick={() => { handleReconnect(); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                  title="Refresh QR"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400 hover:text-green-600" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              <div className="inline-block p-4 bg-white rounded-xl border-2 border-green-100 relative">
                <img src={qrData} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="mt-4 text-xs text-gray-400">QR refreshes automatically every ~20 seconds</p>
            </div>
          )}

          {/* Disconnected */}
          {connState === 'disconnected' && !qrData && (
            <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
              <WifiOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">WhatsApp Not Connected</h2>
              <p className="text-sm text-gray-500 mb-6">
                The Baileys bridge service may not be running, or WhatsApp session expired.
              </p>
              <button
                onClick={handleReconnect}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Try Reconnect
              </button>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Troubleshooting:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Make sure the Baileys bridge service is running</li>
                  <li>Check that <code>WHATSAPP_BRIDGE_HTTP_URL</code> env var points to the bridge</li>
                  <li>If on Railway, check the service logs</li>
                </ul>
              </div>
            </div>
          )}

          {/* Connected Info */}
          {isConnected && (
            <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">WhatsApp Connected</h2>
              {status?.phone && (
                <p className="text-sm text-gray-600 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {status.phone.name || status.phone.id}
                </p>
              )}
              <p className="text-xs text-gray-400 mb-6">
                Uptime: {status?.uptime ? formatUptime(status.uptime) : 'unknown'}
              </p>
              <button
                onClick={() => { setTab('inbox'); fetchChats(); }}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Open Inbox →
              </button>
            </div>
          )}

          {/* Bridge Info */}
          <div className="mt-6 bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Bridge Status</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-500">Connection</div>
              <div className="font-medium">{connState}</div>
              <div className="text-gray-500">Retry Count</div>
              <div className="font-medium">{status?.retryCount ?? '—'}</div>
              <div className="text-gray-500">Uptime</div>
              <div className="font-medium">{status?.uptime ? formatUptime(status.uptime) : '—'}</div>
              <div className="text-gray-500">QR Available</div>
              <div className="font-medium">{qrData ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Tab */}
      {!loading && tab === 'inbox' && (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Chat List */}
          <div className="w-[26rem] border-r bg-white flex flex-col">
            {/* Chat filter tabs: All | Unread | Read | Groups */}
            <div className="px-2 py-1 border-b flex items-center gap-0.5 bg-gray-50">
              {([
                { key: 'all' as ChatFilter, label: 'All', icon: null, count: chats.filter(c => activeFunnel === 'all' || chatFunnels[c.id] === activeFunnel).length },
                { key: 'unread' as ChatFilter, label: 'Unread', icon: <Mail className="w-2.5 h-2.5" />, count: chats.filter(c => c.unreadCount > 0 && (activeFunnel === 'all' || chatFunnels[c.id] === activeFunnel)).length },
                { key: 'read' as ChatFilter, label: 'Read', icon: <MailOpen className="w-2.5 h-2.5" />, count: chats.filter(c => c.unreadCount === 0 && (activeFunnel === 'all' || chatFunnels[c.id] === activeFunnel)).length },
                { key: 'groups' as ChatFilter, label: 'Groups', icon: <Users className="w-2.5 h-2.5" />, count: chats.filter(c => c.isGroup && (activeFunnel === 'all' || chatFunnels[c.id] === activeFunnel)).length },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => { setChatFilter(f.key); setSelectedChats(new Set()); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition whitespace-nowrap ${
                    chatFilter === f.key
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f.icon}
                  {f.label}
                  <span className={`text-[9px] px-1 rounded-full ${chatFilter === f.key ? 'bg-white/30' : 'bg-gray-200'}`}>{f.count}</span>
                </button>
              ))}
            </div>
            {/* Search bar */}
            <div className="px-2 py-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, number, or message..."
                  className="w-full pl-7 pr-7 py-1.5 text-xs bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-green-400 focus:bg-white outline-none placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {/* Chat list header with actions */}
            <div className="px-2 py-1.5 border-b flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button onClick={selectAllChats} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600" title="Select all">
                  {selectedChats.size === filteredChats.length && filteredChats.length > 0 ? 'Deselect' : 'All'}
                </button>
                {selectedChats.size > 0 && (
                  <span className="text-[10px] text-blue-600 font-medium">{selectedChats.size} selected</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {selectedChats.size > 0 && (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => { setShowBulkFunnel(!showBulkFunnel); setShowBulkLabel(false); }}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 rounded text-blue-600 border border-blue-200 flex items-center gap-0.5"
                      >
                        <Funnel className="w-2.5 h-2.5" /> Funnel
                      </button>
                      {showBulkFunnel && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 w-40 py-1">
                          {funnelStages.filter(s => s.key !== 'all').map(stage => (
                            <button
                              key={stage.key}
                              onClick={() => assignFunnel(stage.key)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                              <span className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0]}`}></span>
                              {stage.label}
                            </button>
                          ))}
                          <hr className="my-1" />
                          <button
                            onClick={() => assignFunnel('')}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-red-500"
                          >
                            Remove from funnel
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => { setShowBulkFunnel(false); openEditModal('funnel', 'add'); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-blue-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add new stage
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => { setShowBulkLabel(!showBulkLabel); setShowBulkFunnel(false); }}
                        className="px-1.5 py-0.5 text-[10px] bg-purple-50 hover:bg-purple-100 rounded text-purple-600 border border-purple-200 flex items-center gap-0.5"
                      >
                        <Tag className="w-2.5 h-2.5" /> Label
                      </button>
                      {showBulkLabel && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 w-40 py-1">
                          {labelPresets.map(label => (
                            <button
                              key={label.key}
                              onClick={() => assignLabel(label.key)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                              <span className={`px-1.5 py-0.5 rounded text-[9px] ${label.color}`}>{label.label}</span>
                            </button>
                          ))}
                          <hr className="my-1" />
                          <button
                            onClick={() => { setShowBulkLabel(false); openEditModal('label', 'add'); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-purple-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add new label
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <button onClick={fetchChats} className="p-1 rounded hover:bg-gray-100" title="Refresh">
                  <RefreshCw className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Chat items */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {chatFilter === 'groups' ? 'No group chats found.' :
                   chatFilter === 'unread' ? 'No unread chats.' :
                   chatFilter === 'read' ? 'No read chats.' :
                   activeFunnel !== 'all' ? `No chats in "${funnelStages.find(s => s.key === activeFunnel)?.label}"` :
                   isConnected ? 'No chats yet.' : 'Connect WhatsApp to see chats.'}
                </div>
              )}
              {filteredChats.map(chat => {
                const avatarColor = getAvatarColor(chat.name);
                const initials = getInitials(chat.name);
                const lastMsgTime = chat.lastMessageTime ? new Date(chat.lastMessageTime) : null;
                const timeStr = lastMsgTime ? (
                  lastMsgTime.toDateString() === new Date().toDateString()
                    ? lastMsgTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : lastMsgTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                ) : '';
                const chatStage = chatFunnels[chat.id];
                const chatLabelList = chatLabels[chat.id] || [];
                const isSelected = selectedChats.has(chat.id);
                const stageInfo = funnelStages.find(s => s.key === chatStage);

                return (
                  <div
                    key={chat.id}
                    className={`w-full text-left px-2 py-2 border-b hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer ${
                      selectedChat === chat.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => selectChat(chat.id)}
                  >
                    {/* Checkbox — always visible */}
                    <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleChatSelection(chat.id); }}>
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                      }
                    </div>

                    {/* Avatar / Profile Picture */}
                    <div className="relative flex-shrink-0">
                      {profilePics[chat.id] ? (
                        <img
                          src={profilePics[chat.id]!}
                          alt={chat.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs ${avatarColor} ${profilePics[chat.id] ? 'hidden' : ''}`}>
                        {chat.isGroup ? <Users className="w-5 h-5" /> : (initials || '👤')}
                      </div>
                      {chat.isGroup && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center border-2 border-white">
                          <Users className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                          {chat.isGroup && <Users className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                          {chat.isGroup
                            ? (/^\d+$/.test(chat.name) ? `Group ${chat.name.slice(0, 8)}...` : chat.name)
                            : (chat.resolvedPhone
                              ? formatPhoneNumber(chat.resolvedPhone)
                              : (/^\d{14,}$/.test(chat.name)
                                ? `~ Contact ${chat.name.slice(-4)}`
                                : (/^\d+$/.test(chat.name) ? formatPhoneNumber(chat.name) : (chat.name.includes('@') ? formatPhoneNumber(chat.name.split('@')[0]) : (/^[A-Za-z]/.test(chat.name) && chat.name !== 'Swar Yoga' ? chat.name : formatPhoneNumber(chat.id.split('@')[0]))))))
                          }
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {chat.unreadCount > 0 && (
                            <span className="bg-green-500 text-white text-[9px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-medium">
                              {chat.unreadCount}
                            </span>
                          )}
                          {timeStr && <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeStr}</span>}
                        </div>
                      </div>
                      {/* Funnel stage + labels row */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {stageInfo && (
                          <span className={`text-[9px] px-1.5 py-0 rounded-full border ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                        )}
                        {chatLabelList.map(lbl => {
                          const labelInfo = labelPresets.find(l => l.key === lbl);
                          return labelInfo ? (
                            <span key={lbl} className={`text-[9px] px-1 py-0 rounded ${labelInfo.color} flex items-center gap-0.5`}>
                              {labelInfo.label}
                              <button onClick={(e) => { e.stopPropagation(); removeChatLabel(chat.id, lbl); }} className="hover:text-red-600">
                                <X className="w-2 h-2" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        {!stageInfo && chatLabelList.length === 0 && chat.lastMessage && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {chat.lastMessage.substring(0, 35)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 flex flex-col bg-gray-100">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a chat to start messaging</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header — Compact Single Row */}
                <div className="bg-white px-3 py-1.5 border-b flex items-center gap-2 justify-between">
                  {/* Left: Avatar + Phone + Online + Stage (clickable to open details) */}
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 py-0.5 transition"
                    onClick={() => openDetailsPanel(selectedChat)}
                  >
                    <button onClick={(e) => { e.stopPropagation(); setSelectedChat(null); }} className="lg:hidden p-1 hover:bg-gray-100 rounded flex-shrink-0">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    {(() => {
                      const selectedChatInfo = chats.find(c => c.id === selectedChat);
                      const isGroupChat = selectedChat.endsWith('@g.us') || selectedChat.endsWith('@lid');
                      const headerDisplayName = isGroupChat
                        ? (selectedChatInfo?.name || selectedChat.split('@')[0])
                        : (selectedChatInfo?.resolvedPhone || selectedChat.replace('@s.whatsapp.net', ''));
                      const chatName = isGroupChat
                        ? (selectedChatInfo?.name || selectedChat.split('@')[0])
                        : selectedChat.replace('@s.whatsapp.net', '');
                      const avatarColor = getAvatarColor(chatName);
                      const initials = getInitials(chatName);
                      const stage = chatFunnels[selectedChat];
                      const stageInfo = funnelStages.find(s => s.key === stage);
                      const labels = chatLabels[selectedChat] || [];
                      return (
                        <>
                          {profilePics[selectedChat] ? (
                            <img
                              src={profilePics[selectedChat]!}
                              alt={chatName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${avatarColor} ${profilePics[selectedChat] ? 'hidden' : ''}`}>
                            {isGroupChat ? <Users className="w-4 h-4" /> : (initials || '👤')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isGroupChat && <Users className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                              <p className="font-medium text-sm truncate">{isGroupChat ? headerDisplayName : formatPhoneNumber(headerDisplayName)}</p>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {stageInfo && (
                                <span className={`text-[9px] px-1.5 rounded-full border ${stageInfo.color}`}>{stageInfo.label}</span>
                              )}
                              {labels.map(lbl => {
                                const li = labelPresets.find(l => l.key === lbl);
                                return li ? <span key={lbl} className={`text-[9px] px-1 rounded ${li.color}`}>{li.label}</span> : null;
                              })}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Right: Call buttons + Info + Refresh */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        const chatInfo = chats.find(c => c.id === selectedChat);
                        const phone = chatInfo?.resolvedPhone || selectedChat.replace('@s.whatsapp.net', '').replace('@g.us', '');
                        window.open(`tel:+${phone}`, '_blank');
                      }}
                      className="p-1.5 rounded-full hover:bg-green-50 text-gray-500 hover:text-green-600 transition"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const chatInfo = chats.find(c => c.id === selectedChat);
                        const phone = chatInfo?.resolvedPhone || selectedChat.replace('@s.whatsapp.net', '').replace('@g.us', '');
                        window.open(`https://wa.me/${phone}?video=true`, '_blank');
                      }}
                      className="p-1.5 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition"
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDetailsPanel(selectedChat)}
                      className={`p-1.5 rounded-full hover:bg-gray-100 transition ${detailsPanel ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                      title="Contact Info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchMessages(selectedChat)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
                      title="Refresh messages"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div ref={messengerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-10">No messages yet</div>
                  )}
                  {messages.map(msg => {
                    const isGroupChat = selectedChat?.endsWith('@g.us') || selectedChat?.endsWith('@lid');
                    const senderName = msg.pushName || msg.participant?.split('@')[0] || '';
                    const senderColor = senderName ? getAvatarColor(senderName) : '';
                    const isImage = msg.type === 'image' || msg.mediaMimetype?.startsWith('image/');
                    const isVideo = msg.type === 'video' || msg.mediaMimetype?.startsWith('video/');
                    const isAudio = msg.type === 'audio' || msg.type === 'ptt' || msg.mediaMimetype?.startsWith('audio/');
                    const isDocument = msg.type === 'document' || (msg.hasMedia && !isImage && !isVideo && !isAudio);
                    // Primary URL: Bunny CDN via media proxy
                    const proxyUrl = msg.mediaUrl ? `/api/admin/crm/media/proxy?url=${encodeURIComponent(msg.mediaUrl)}&token=${encodeURIComponent(token || '')}` : null;
                    // Fallback URL: download directly from bridge via server-side proxy (no CORS issues)
                    const bridgeProxyUrl = (msg.hasMedia && msg.id) ? `/api/admin/crm/media/bridge-download?messageId=${encodeURIComponent(msg.id)}&token=${encodeURIComponent(token || '')}` : null;
                    // Use Bunny CDN first, bridge-download as fallback
                    const mediaDisplayUrl = proxyUrl || bridgeProxyUrl;
                    const hasMediaPreview = mediaDisplayUrl && (isImage || isVideo || isAudio || isDocument);
                    const hasOnlyMedia = hasMediaPreview && !msg.text;
                    return (
                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`${hasOnlyMedia && isImage ? 'max-w-[320px]' : 'max-w-[65%] min-w-[120px]'} px-2.5 py-1.5 rounded-2xl text-sm shadow-sm ${
                        msg.fromMe
                          ? 'bg-[#d9fdd3] text-gray-900 rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md'
                      }`}>
                        {/* Group sender name */}
                        {isGroupChat && !msg.fromMe && senderName && (
                          <p className={`text-[11px] font-semibold mb-0.5 ${senderColor.replace('bg-', 'text-')}`}>
                            {senderName}
                          </p>
                        )}

                        {/* Media preview */}
                        {hasMediaPreview && mediaDisplayUrl && isImage && (
                          <div className="mb-1 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition -mx-1 -mt-0.5" onClick={() => setLightboxImage(mediaDisplayUrl)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={mediaDisplayUrl} 
                              alt="Image" 
                              className="w-full max-h-[300px] object-cover rounded-xl"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                // Try bridge-download fallback if Bunny proxy failed
                                if (bridgeProxyUrl && img.src !== bridgeProxyUrl) {
                                  img.src = bridgeProxyUrl;
                                } else {
                                  img.style.display = 'none';
                                }
                              }}
                            />
                          </div>
                        )}
                        {hasMediaPreview && mediaDisplayUrl && isVideo && (
                          <div className="mb-1.5 relative rounded-lg overflow-hidden bg-black">
                            <video 
                              src={mediaDisplayUrl} 
                              className="max-w-full max-h-[200px] rounded-lg" 
                              preload="metadata" 
                              controls
                              onError={(e) => {
                                const vid = e.target as HTMLVideoElement;
                                if (bridgeProxyUrl && vid.src !== bridgeProxyUrl) {
                                  vid.src = bridgeProxyUrl;
                                } else {
                                  vid.style.display = 'none';
                                }
                              }}
                            />
                          </div>
                        )}
                        {hasMediaPreview && mediaDisplayUrl && isAudio && (
                          <div className="mb-1.5">
                            <audio src={mediaDisplayUrl} controls preload="metadata" className="max-w-full h-10" />
                          </div>
                        )}
                        {hasMediaPreview && mediaDisplayUrl && isDocument && (
                          <div className="mb-1.5 flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition group">
                            <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              {msg.mediaFileName && <p className="text-xs font-semibold text-gray-700 truncate">{msg.mediaFileName}</p>}
                              <a href={mediaDisplayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 group-hover:underline">
                                Download {msg.mediaFileName ? '' : 'document'}
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Fallback download button — only show when NO inline preview is available */}
                        {!hasMediaPreview && msg.hasMedia && (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'document') && (
                          <div className="mb-1.5 flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                               onClick={() => downloadMediaFromBridge(msg.id, msg.mediaFileName || undefined)}>
                            {msg.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            {msg.type === 'video' && <Video className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            {msg.type === 'audio' && <Mic className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            {msg.type === 'document' && <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            <span className="text-xs text-blue-600 font-medium flex-1">
                              {downloadingMedia === msg.id ? (
                                <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                              ) : null}
                              {downloadingMedia === msg.id ? 'Downloading...' : `Download ${msg.mediaFileName ? '' : msg.type}`}
                            </span>
                          </div>
                        )}

                        {/* Type indicator for media without preview URL and no binary (stickers, etc.) */}
                        {msg.type !== 'text' && !hasMediaPreview && !(msg.hasMedia && (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'document')) && (
                          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            {msg.type === 'image' && <ImageIcon className="w-3 h-3" />}
                            {msg.type === 'video' && <Video className="w-3 h-3" />}
                            {msg.type === 'document' && <FileText className="w-3 h-3" />}
                            {msg.type === 'audio' && <Mic className="w-3 h-3" />}
                            {msg.type === 'sticker' && <span className="text-xs">🏷️</span>}
                            [{msg.type}]
                          </div>
                        )}

                        {/* Message text (skip generic media labels when we have a preview) */}
                        {msg.text && !(hasMediaPreview && /^\[(image|video|document|audio|sticker)\]$/i.test(msg.text)) && (
                          <p className="whitespace-pre-wrap break-words">{linkifyText(msg.text)}</p>
                        )}
                        {!msg.text && !hasMediaPreview && (
                          <p className="whitespace-pre-wrap break-words">[{msg.type}]</p>
                        )}

                        <div className="text-[10px] text-gray-400 mt-1 text-right">
                          {msg.timestamp
                            ? new Date(typeof msg.timestamp === 'number' && msg.timestamp < 10000000000
                                ? msg.timestamp * 1000
                                : msg.timestamp
                              ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />

                {/* Media preview bar */}
                {mediaPreview && (
                  <div className="bg-gray-50 border-t px-4 py-2 flex items-center gap-3">
                    {mediaPreview.type.startsWith('image/') ? (
                      <img src={mediaPreview.base64} alt="preview" className="w-12 h-12 object-cover rounded" />
                    ) : mediaPreview.type.startsWith('video/') ? (
                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center"><Video className="w-5 h-5 text-blue-600" /></div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center"><File className="w-5 h-5 text-gray-600" /></div>
                    )}
                    <span className="text-xs text-gray-600 truncate flex-1">{mediaPreview.file.name}</span>
                    <button onClick={() => setMediaPreview(null)} className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4 text-gray-500" /></button>
                  </div>
                )}

                {/* Composer */}
                <div className="bg-white border-t relative">
                  {/* Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-12 mb-1 bg-white border rounded-xl shadow-xl p-3 w-80 z-30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500">Emoji</span>
                        <button onClick={() => setShowEmojiPicker(false)} className="p-0.5 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
                        {EMOJI_LIST.map((emoji, i) => (
                          <button key={i} onClick={() => { setComposerText(prev => prev + emoji); setShowEmojiPicker(false); }} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attach Menu Popup */}
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-1 ml-2 bg-white border rounded-xl shadow-xl py-2 w-44 z-30">
                      <button onClick={() => { handleFileSelect('image/*'); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><ImageIcon className="w-4 h-4 text-green-600" /> Image</button>
                      <button onClick={() => { handleFileSelect('video/*'); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Video className="w-4 h-4 text-blue-600" /> Video</button>
                      <button onClick={() => { handleFileSelect('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4 text-orange-500" /> Document</button>
                      <button onClick={() => { handleFileSelect('audio/*'); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Mic className="w-4 h-4 text-purple-500" /> Audio</button>
                    </div>
                  )}

                  {/* Format Bar Popup */}
                  {showFormatBar && (
                    <div className="absolute bottom-full left-24 mb-1 bg-white border rounded-xl shadow-xl py-1.5 w-48 z-30">
                      <button onClick={() => applyFormat('*', '*')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Bold className="w-4 h-4 text-gray-600" /> <span>Bold</span> <span className="ml-auto text-[10px] text-gray-400">*text*</span></button>
                      <button onClick={() => applyFormat('_', '_')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Italic className="w-4 h-4 text-gray-600" /> <span>Italic</span> <span className="ml-auto text-[10px] text-gray-400">_text_</span></button>
                      <button onClick={() => applyFormat('~', '~')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Strikethrough className="w-4 h-4 text-gray-600" /> <span>Strike</span> <span className="ml-auto text-[10px] text-gray-400">~text~</span></button>
                      <button onClick={() => applyFormat('```', '```')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Type className="w-4 h-4 text-gray-600" /> <span>Code</span> <span className="ml-auto text-[10px] text-gray-400">{'{`code`}'}</span></button>
                    </div>
                  )}

                  {/* Input Row */}
                  <div className="px-3 py-2 flex items-center gap-1.5">
                    {/* Attach button */}
                    <button
                      onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); setShowFormatBar(false); }}
                      disabled={!isConnected}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-green-600 disabled:opacity-40 transition"
                      title="Attach"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    {/* Emoji button */}
                    <button
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); setShowFormatBar(false); }}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-yellow-600 transition"
                      title="Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    {/* Format button */}
                    <button
                      onClick={() => { setShowFormatBar(!showFormatBar); setShowEmojiPicker(false); setShowAttachMenu(false); }}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                      title="Format text"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    {/* Text Input */}
                    <input
                      ref={composerInputRef}
                      type="text"
                      value={composerText}
                      onChange={e => setComposerText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                      onFocus={closeComposerPopups}
                      placeholder={mediaPreview ? 'Add caption...' : 'Type a message...'}
                      className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                      disabled={!isConnected || sending}
                    />
                    {/* Star button — Quick Actions */}
                    <button
                      onClick={() => { setShowStarPopup(true); closeComposerPopups(); }}
                      disabled={!isConnected}
                      className="p-2 rounded-full hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 disabled:opacity-40 transition"
                      title="Quick Actions"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    {/* Send button */}
                    <button
                      onClick={handleSend}
                      disabled={(!composerText.trim() && !mediaPreview) || !isConnected || sending}
                      className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Details Panel — slides in from right */}
          {detailsPanel && selectedChat && (() => {
            const selectedChatInfo = chats.find(c => c.id === selectedChat);
            const isGroupChat = selectedChat.endsWith('@g.us') || selectedChat.endsWith('@lid');
            const chatName = isGroupChat
              ? (selectedChatInfo?.name || selectedChat.split('@')[0])
              : selectedChat.replace('@s.whatsapp.net', '');
            const avatarColor = getAvatarColor(chatName);
            const initials = getInitials(chatName);
            const stage = chatFunnels[selectedChat];
            const stageInfo = funnelStages.find(s => s.key === stage);
            const labels = chatLabels[selectedChat] || [];
            const phone = selectedChat.replace('@s.whatsapp.net', '').replace('@g.us', '');

            return (
              <div className="w-80 border-l bg-white flex flex-col overflow-y-auto">
                {/* Panel Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">{isGroupChat ? 'Group Info' : 'Contact Info'}</h3>
                  <button onClick={() => setDetailsPanel(false)} className="p-1 rounded hover:bg-gray-200">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Profile Section */}
                <div className="flex flex-col items-center py-6 px-4 border-b">
                  {isGroupChat ? (
                    <>
                      {profilePics[selectedChat] ? (
                        <img
                          src={profilePics[selectedChat]!}
                          alt={chatName}
                          className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition ring-2 ring-white shadow-lg"
                          onClick={() => setLightboxImage(profilePics[selectedChat]!)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white ${avatarColor} ${profilePics[selectedChat] ? 'hidden' : ''}`}>
                        <Users className="w-10 h-10" />
                      </div>
                    </>
                  ) : (
                    <>
                      {profilePics[selectedChat] ? (
                        <img
                          src={profilePics[selectedChat]!}
                          alt={chatName}
                          className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition ring-2 ring-white shadow-lg"
                          onClick={() => setLightboxImage(profilePics[selectedChat]!)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl ${avatarColor} ${profilePics[selectedChat] ? 'hidden' : ''}`}>
                        {initials || '👤'}
                      </div>
                    </>
                  )}
                  <h4 className="mt-3 text-base font-semibold text-gray-900 text-center">
                    {isGroupChat ? chatName : formatPhoneNumber(chatName)}
                  </h4>
                  {!isGroupChat && (
                    <p className="text-xs text-gray-500 mt-0.5">+{phone}</p>
                  )}
                  {isGroupChat && groupInfo && (
                    <p className="text-xs text-gray-500 mt-0.5">{groupInfo.size || groupInfo.participants?.length || 0} members visible</p>
                  )}
                  <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Call Buttons */}
                <div className="flex items-center justify-center gap-6 py-4 border-b">
                  <button
                    onClick={() => window.open(`tel:+${phone}`, '_blank')}
                    className="flex flex-col items-center gap-1 group"
                    title="Voice Call"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-[10px] text-gray-500">Audio</span>
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/${phone}?video=true`, '_blank')}
                    className="flex flex-col items-center gap-1 group"
                    title="Video Call"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition">
                      <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] text-gray-500">Video</span>
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/${phone}`, '_blank')}
                    className="flex flex-col items-center gap-1 group"
                    title="Open in WhatsApp"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] text-gray-500">Chat</span>
                  </button>
                </div>

                {/* Details Section */}
                <div className="px-4 py-3 border-b space-y-3">
                  <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Details</h5>
                  {!isGroupChat && (
                    <>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm text-gray-900 font-medium">{formatPhoneNumber(phone)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">WhatsApp JID</p>
                          <p className="text-[11px] text-gray-600 font-mono">{selectedChat}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {isGroupChat && groupInfo && (
                    <>
                      {/* Editable Group Description */}
                      <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Description</p>
                            {!editingDesc && (
                              <button
                                onClick={() => { setEditingDesc(true); setEditDescText(groupInfo.desc || ''); }}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {editingDesc ? (
                            <div className="mt-1 space-y-1.5">
                              <textarea
                                value={editDescText}
                                onChange={(e) => setEditDescText(e.target.value)}
                                rows={3}
                                className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                                placeholder="Group description..."
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => updateGroupDesc()}
                                  disabled={savingDesc}
                                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingDesc(false)}
                                  className="text-[10px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{groupInfo.desc || <span className="italic text-gray-400">No description</span>}</p>
                          )}
                        </div>
                      </div>
                      {groupInfo.creation && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="text-sm text-gray-700">{new Date(groupInfo.creation * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Group JID</p>
                          <p className="text-[11px] text-gray-600 font-mono">{selectedChat}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Group Invite Link */}
                {isGroupChat && (
                  <div className="px-4 py-3 border-b space-y-2">
                    <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Invite Link</h5>
                    {groupInviteLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
                          <Link2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          <p className="text-[11px] text-gray-700 font-mono truncate flex-1">{groupInviteLink}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { navigator.clipboard.writeText(groupInviteLink); }}
                            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button
                            onClick={() => revokeGroupInvite()}
                            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <RotateCcw className="w-3 h-3" /> Revoke
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fetchGroupInvite()}
                        disabled={loadingInvite}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        {loadingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                        Get Invite Link
                      </button>
                    )}
                  </div>
                )}

                {/* Group Settings */}
                {isGroupChat && (
                  <div className="px-4 py-3 border-b space-y-2">
                    <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Group Settings</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-700">Only admins can send messages</span>
                        </div>
                        <button
                          onClick={() => updateGroupSetting(groupInfo?.announce ? 'not_announcement' : 'announcement')}
                          disabled={!!groupSettingsLoading}
                          className={`relative w-9 h-5 rounded-full transition-colors ${groupInfo?.announce ? 'bg-green-500' : 'bg-gray-300'} ${groupSettingsLoading ? 'opacity-50' : ''}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${groupInfo?.announce ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-700">Only admins can edit group info</span>
                        </div>
                        <button
                          onClick={() => updateGroupSetting(groupInfo?.restrict ? 'not_locked' : 'locked')}
                          disabled={!!groupSettingsLoading}
                          className={`relative w-9 h-5 rounded-full transition-colors ${groupInfo?.restrict ? 'bg-green-500' : 'bg-gray-300'} ${groupSettingsLoading ? 'opacity-50' : ''}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${groupInfo?.restrict ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Funnel & Labels */}
                <div className="px-4 py-3 border-b space-y-2">
                  <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">CRM</h5>
                  <div className="flex items-center gap-2">
                    <Funnel className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Stage:</span>
                    {stageInfo ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stageInfo.color}`}>{stageInfo.label}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">None</span>
                    )}
                  </div>
                  {labels.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">Labels:</span>
                      {labels.map(lbl => {
                        const li = labelPresets.find(l => l.key === lbl);
                        return li ? (
                          <span key={lbl} className={`text-[9px] px-1.5 py-0.5 rounded ${li.color}`}>{li.label}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Messages:</span>
                    <span className="text-xs text-gray-700 font-medium">{messages.length}</span>
                  </div>
                  {selectedChatInfo && selectedChatInfo.unreadCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">Unread:</span>
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-1.5 rounded-full">{selectedChatInfo.unreadCount}</span>
                    </div>
                  )}
                </div>

                {/* Group Participants */}
                {isGroupChat && (
                  <div className="px-4 py-3 space-y-2 flex-1">
                    <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Members ({groupInfo?.size || groupInfo?.participants?.length || 0} visible)
                    </h5>
                    {loadingGroupInfo ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : groupInfo ? (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {groupInfo.participants.length <= 3 && (
                          <p className="text-[10px] text-gray-400 italic px-2 pb-1">WhatsApp shows limited members for linked devices. More members appear as they send messages.</p>
                        )}
                        {groupInfo.participants
                          .sort((a, b) => {
                            const order = { superadmin: 0, admin: 1 };
                            const aOrder = a.admin ? (order[a.admin] ?? 2) : 2;
                            const bOrder = b.admin ? (order[b.admin] ?? 2) : 2;
                            return aOrder - bOrder;
                          })
                          .map(p => {
                            const pId = p.id || '';
                            const isLidId = pId.endsWith('@lid');
                            const pPhone = pId.replace('@s.whatsapp.net', '').replace('@lid', '');
                            const pColor = getAvatarColor(pPhone);
                            const displayName = isLidId ? `Member ${pPhone.slice(-4)}` : formatPhoneNumber(pPhone);
                            const isSuperAdmin = p.admin === 'superadmin';
                            const isAdmin = p.admin === 'admin';
                            return (
                              <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group/participant">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${pColor}`}>
                                  {pPhone.slice(-2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-800 truncate">{displayName}</p>
                                </div>
                                {isSuperAdmin && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> Owner
                                  </span>
                                )}
                                {isAdmin && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> Admin
                                  </span>
                                )}
                                {/* Admin actions - visible on hover */}
                                {!isSuperAdmin && (
                                  <div className="hidden group-hover/participant:flex items-center gap-0.5">
                                    {isAdmin ? (
                                      <button
                                        onClick={() => updateGroupParticipant(pId, 'demote')}
                                        className="p-1 rounded hover:bg-orange-100 text-gray-400 hover:text-orange-600" title="Demote from admin"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => updateGroupParticipant(pId, 'promote')}
                                        className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600" title="Make admin"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => updateGroupParticipant(pId, 'remove')}
                                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600" title="Remove from group"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">Could not load participants</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Status/Stories Panel */}
      {showStatusPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <h2 className="text-base font-semibold">Status Updates</h2>
                {statusData.length > 0 && (
                  <span className="text-[10px] bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">{statusData.length} contacts</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchStatuses} className="p-1 rounded hover:bg-white hover:bg-opacity-20" title="Refresh">
                  <RefreshCw className={`w-4 h-4 ${loadingStatuses ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => { setShowStatusPanel(false); setSelectedStatusUser(null); }} className="p-1 rounded hover:bg-white hover:bg-opacity-20">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingStatuses ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-3" />
                  <p className="text-sm text-gray-500">Loading statuses...</p>
                </div>
              ) : selectedStatusUser ? (
                /* Status Viewer */
                <div className="flex flex-col h-full">
                  {/* Viewer Header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
                    <button onClick={() => { setSelectedStatusUser(null); setCurrentStatusIndex(0); }} className="p-1 rounded hover:bg-gray-200">
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(selectedStatusUser.senderPhone)}`}>
                      {selectedStatusUser.senderPhone.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedStatusUser.senderName}</p>
                      <p className="text-[10px] text-gray-500">{selectedStatusUser.statuses.length} status{selectedStatusUser.statuses.length > 1 ? 'es' : ''}</p>
                    </div>
                    {selectedStatusUser.statuses.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentStatusIndex(Math.max(0, currentStatusIndex - 1))}
                          disabled={currentStatusIndex === 0}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-gray-500">{currentStatusIndex + 1}/{selectedStatusUser.statuses.length}</span>
                        <button
                          onClick={() => setCurrentStatusIndex(Math.min(selectedStatusUser.statuses.length - 1, currentStatusIndex + 1))}
                          disabled={currentStatusIndex >= selectedStatusUser.statuses.length - 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Status Content */}
                  {(() => {
                    const status = selectedStatusUser.statuses[currentStatusIndex];
                    if (!status) return null;
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[300px]">
                        {/* Progress dots */}
                        {selectedStatusUser.statuses.length > 1 && (
                          <div className="flex gap-1 mb-4">
                            {selectedStatusUser.statuses.map((_: any, i: number) => (
                              <div
                                key={i}
                                className={`h-0.5 rounded-full transition-all ${i === currentStatusIndex ? 'w-6 bg-green-500' : 'w-3 bg-gray-300'}`}
                              />
                            ))}
                          </div>
                        )}
                        {status.hasMedia ? (
                          <div className="w-full max-w-sm">
                            <img
                              src={`/api/admin/crm/whatsapp/qr-bridge?path=${encodeURIComponent(`/media/${status.mediaMessageId}`)}`}
                              alt="Status"
                              className="w-full rounded-xl shadow-lg object-contain max-h-[400px]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden text-center py-8">
                              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-400">Media not available</p>
                            </div>
                            {status.text && (
                              <p className="text-sm text-gray-700 text-center mt-3">{status.text}</p>
                            )}
                          </div>
                        ) : status.type === 'text' ? (
                          <div className="w-full max-w-sm bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-8 shadow-lg">
                            <p className="text-white text-lg text-center font-medium leading-relaxed">{status.text}</p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Status type: {status.type}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-4">
                          {new Date(status.timestamp * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : statusData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Eye className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No recent statuses</p>
                  <p className="text-[10px] text-gray-400 mt-1">Statuses from contacts will appear here as they are posted</p>
                </div>
              ) : (
                /* Status List */
                <div className="divide-y">
                  {statusData.map((user: any) => (
                    <button
                      key={user.senderJid}
                      onClick={() => { setSelectedStatusUser(user); setCurrentStatusIndex(0); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition"
                    >
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(user.senderPhone)} ring-2 ring-green-500 ring-offset-2`}>
                          {user.senderPhone.slice(-2)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">{user.statuses.length}</span>
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.senderName}</p>
                        <p className="text-[10px] text-gray-500">
                          {user.statuses.length} status{user.statuses.length > 1 ? 'es' : ''} · {new Date(user.statuses[0].timestamp * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📥</span>
                <h2 className="text-xl font-bold">QR WhatsApp PC Extension</h2>
              </div>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All-in-One WhatsApp Business Automation
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Power up your WhatsApp management with a single Node.js script. Manage leads, labels, messaging, and automation—all from the command line.
                </p>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">✨ Key Features</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Funnel Management</strong> — Track leads through custom sales pipelines</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Label System</strong> — Multi-label contact organization</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Batch Messaging</strong> — Send to 10 people with smart delays</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Category Management</strong> — Organize contacts by department</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Date Filtering</strong> — View messages by time period</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>QR Code Scanning</strong> — Easy PC WhatsApp connection</span>
                  </li>
                </ul>
              </div>

              {/* Setup Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">🚀 Quick Setup (3 Steps)</h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li><strong>1. Download</strong> the script using the button below</li>
                  <li><strong>2. Run</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">node qr-whatsapp-pc-extension.js</code></li>
                  <li><strong>3. Choose from 21 interactive menu options</strong></li>
                </ol>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">📋 Requirements</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Node.js 14+ installed</li>
                  <li>• WhatsApp Bridge running (port 3333)</li>
                  <li>• MongoDB connection configured</li>
                  <li>• `.env.local` with credentials</li>
                </ul>
              </div>

              {/* Usage Example */}
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <p className="mb-2"># Launch interactive menu</p>
                <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js</p>
                <p className="mt-3 mb-2"># Or run specific commands</p>
                <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js qr</p>
                <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js funnel:list</p>
              </div>

              {/* Documentation Link */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                <p className="font-semibold mb-2">📚 Full Documentation Available</p>
                <p>See <strong>QR_TOOL_COMPLETE_GUIDE.md</strong> or <strong>QR_WHATSAPP_PC_EXTENSION_GUIDE.md</strong> in your project root for detailed command reference.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                v1.0 — Unified WhatsApp Business Automation
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExtensionModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadInstaller}
                  disabled={downloadingExtension}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {downloadingExtension ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      Download & Install
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <h2 className="text-2xl font-bold">✅ Almost Done!</h2>
              <p className="text-green-100 mt-1">Just 2 quick steps to run the extension</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Step 1 */}
              <div>
                <h3 className="font-bold text-lg mb-3">Step 1: Open Terminal</h3>
                <p className="text-gray-700 mb-3">Open the Terminal app on your Mac</p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                  Press: <code className="bg-blue-100 px-2 py-1 rounded font-mono">Cmd + Space</code> then type "Terminal"
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h3 className="font-bold text-lg mb-3">Step 2: Run the Installer</h3>
                <p className="text-gray-700 mb-3">Copy & paste this command in Terminal:</p>
                <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono overflow-x-auto flex items-center justify-between group hover:bg-gray-800 cursor-pointer transition">
                  <code>cd ~/Downloads && chmod +x install.sh && ./install.sh</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('cd ~/Downloads && chmod +x install.sh && ./install.sh');
                      alert('✅ Copied to clipboard!');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-2">The installer will automatically check Node.js, install dependencies, and run everything!</p>
              </div>

              {/* Info Box */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <strong>✨ That's it!</strong> The installer handles everything for you. Just copy the command and press Enter.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 border-t p-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Close
              </button>
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Need Node.js?
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Funnel or Label Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              {editModal.mode === 'add' ? 'Add' : 'Edit'} {editModal.type === 'funnel' ? 'Funnel Stage' : 'Label'}
            </h3>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={editModal.type === 'funnel' ? 'Stage name...' : 'Label name...'}
              className="w-full px-3 py-1.5 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveEditModal()}
            />
            <p className="text-[10px] text-gray-500 mb-1.5">Color</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(editModal.type === 'funnel' ? FUNNEL_COLORS : LABEL_COLORS).map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition ${c.split(' ')[0]} ${editColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}`}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              {editModal.mode === 'edit' && editModal.item?.key !== 'all' ? (
                <button onClick={deleteFromModal} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setEditModal(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button
                  onClick={saveEditModal}
                  disabled={!editName.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                >
                  {editModal.mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Star Popup — Quick Actions */}
      {showStarPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowStarPopup(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-xl">
              <div className="flex items-center gap-2 text-white">
                <Star className="w-5 h-5" />
                <h3 className="font-semibold">Quick Actions</h3>
              </div>
              <button onClick={() => setShowStarPopup(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {(['quick', 'template', 'broadcast'] as const).map(t => (
                <button key={t} onClick={() => setStarTab(t)} className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                  starTab === t ? 'text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                  {t === 'quick' && '⚡ Quick Reply'}
                  {t === 'template' && '📋 Templates'}
                  {t === 'broadcast' && '📢 Broadcast'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Quick Reply Tab */}
              {starTab === 'quick' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">Click to insert into message box</p>
                  {QUICK_REPLIES.map((reply, i) => (
                    <button key={i} onClick={() => { setComposerText(prev => prev ? prev + ' ' + reply : reply); setShowStarPopup(false); }} className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-green-50 border rounded-lg text-sm text-gray-700 hover:text-green-700 hover:border-green-300 transition">
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Template Tab */}
              {starTab === 'template' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 mb-3">Click to load template into message box</p>
                  {TEMPLATES.map((tpl, i) => (
                    <button key={i} onClick={() => { setComposerText(tpl.text); setShowStarPopup(false); }} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border rounded-lg hover:border-blue-300 transition">
                      <p className="text-sm font-semibold text-gray-800 mb-1">{tpl.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{tpl.text}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Broadcast Tab */}
              {starTab === 'broadcast' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Send one message to up to 10 contacts at once</p>

                  {/* Message */}
                  <textarea
                    value={broadcastText}
                    onChange={e => setBroadcastText(e.target.value)}
                    placeholder="Type your broadcast message..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                    rows={3}
                  />

                  {/* Contact Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={broadcastSearch}
                      onChange={e => setBroadcastSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-yellow-400 outline-none"
                    />
                  </div>

                  {/* Selected count */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{broadcastChats.size}/10 selected</span>
                    {broadcastChats.size > 0 && (
                      <button onClick={() => setBroadcastChats(new Set())} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                    )}
                  </div>

                  {/* Contact list */}
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {chats
                      .filter(c => !c.isGroup)
                      .filter(c => {
                        if (!broadcastSearch.trim()) return true;
                        const q = broadcastSearch.toLowerCase();
                        return (c.name || '').toLowerCase().includes(q) || (c.resolvedPhone || c.id).toLowerCase().includes(q);
                      })
                      .slice(0, 50)
                      .map(c => {
                        const checked = broadcastChats.has(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setBroadcastChats(prev => {
                                const next = new Set(prev);
                                if (next.has(c.id)) { next.delete(c.id); }
                                else if (next.size < 10) { next.add(c.id); }
                                return next;
                              });
                            }}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition ${checked ? 'bg-yellow-50' : ''}`}
                          >
                            {checked ? <CheckSquare className="w-4 h-4 text-yellow-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                              {getInitials(c.name)}
                            </div>
                            <span className="text-xs text-gray-700 truncate">{c.resolvedPhone ? formatPhoneNumber(c.resolvedPhone) : c.name}</span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleBroadcastSend}
                    disabled={broadcastChats.size === 0 || !broadcastText.trim() || broadcastSending}
                    className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {broadcastSending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send to {broadcastChats.size} contacts</>
                    )}
                  </button>
                </div>
              )}
            </div>
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
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
