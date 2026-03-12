'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, Phone, PhoneCall, Send, Image as ImageIcon, FileText, Mic, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Unplug, Funnel, Plus, Tag, CheckSquare, Square, X, Paperclip, Video, File, Pencil, Trash2, Users, Mail, MailOpen, Radio, Info, Shield, Crown, Calendar, MessageSquare, Hash, UserCircle, PhoneOff, Search, Star, Bold, Italic, Strikethrough, Smile, Zap, Type, Link2, Copy, RotateCcw, Lock, Unlock, UserMinus, ChevronUp, ChevronDown, Save, Settings, Eye, ChevronLeft, ChevronRight, Merge } from 'lucide-react';
import type { ConnectionStatus, BridgeStatus, QRResponse, FunnelStage, LabelPreset, ChatItem, MessageItem, ChatFilter, GroupParticipant, GroupInfo } from './types';
import { formatPhoneNumber, getAvatarColor, linkifyText, getInitials, formatUptime } from './utils';
import { FUNNEL_COLORS, LABEL_COLORS, EMOJI_LIST, QUICK_REPLIES, TEMPLATES, DEFAULT_FUNNEL_STAGES, DEFAULT_LABEL_PRESETS, REACTION_EMOJIS } from './constants';
import {
  MessageTicks,
  StatusPanel,
  ExtensionModal,
  InstallGuideModal,
  EditFunnelLabelModal,
  StarPopup,
  Lightbox,
  GroupCreateModal,
  ConnectionTab,
  SettingsTab,
  DetailsPanel,
} from './components';

function isPlaceholderChatName(name: string | undefined | null): boolean {
  const value = String(name || '').trim();
  if (!value) return true;
  if (/^~\s*Contact\s+\d+$/i.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  if (value.includes('QR Lead')) return true;
  if (value === 'Swar Yoga') return true;
  if (value.includes('@')) return true;
  return false;
}

function extractBestChatPhone(chat: Partial<ChatItem> & Record<string, any>): string {
  const directCandidates = [
    chat.resolvedPhone,
    chat.phoneNumber,
    chat.phone,
    chat.user,
    chat.contact?.phone,
    chat.contact?.number,
  ];

  for (const candidate of directCandidates) {
    const digits = String(candidate || '').replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) return digits;
  }

  const jid = typeof chat.id === 'string' ? chat.id : '';
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us')) {
    const digits = jid.split('@')[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) return digits;
  }

  const nameDigits = String(chat.name || '').replace(/\D/g, '');
  if (nameDigits.length >= 10 && nameDigits.length <= 13) return nameDigits;

  return '';
}

function getSidebarChatTitle(chat: ChatItem): string {
  if (chat.isGroup) {
    return /^\d+$/.test(chat.name) ? `Group ${chat.name.slice(0, 8)}...` : chat.name;
  }

  if (!isPlaceholderChatName(chat.name)) {
    return chat.name;
  }

  const phone = extractBestChatPhone(chat as ChatItem & Record<string, any>);
  if (phone) {
    return formatPhoneNumber(phone);
  }

  return String(chat.name || chat.id.split('@')[0] || 'Unknown Contact');
}

export default function QRWhatsAppPage() {
  const token = useAuth();
  const router = useRouter();
  const { fetch: crmFetch } = useCRM({ token });

  // ═════════════════════════════════════════════════════════════════════════════════
  // IMPORTANT: ALL HOOKS MUST BE DEFINED HERE, BEFORE ANY CONDITIONAL LOGIC
  // This component uses many hooks, so they're all defined unconditionally first.
  // The conditional auth check happens at the END via JSX render, not via early return.
  // ═════════════════════════════════════════════════════════════════════════════════

  // State
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatPresence, setChatPresence] = useState<{ presence: string; lastSeen: number | null } | null>(null);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'connection' | 'inbox' | 'settings'>('connection');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [downloadingExtension, setDownloadingExtension] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeFunnel, setActiveFunnel] = useState<string>('all');
  const [activeLabel, setActiveLabel] = useState<string>('all');
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
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [groupInviteLink, setGroupInviteLink] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [groupSettingsLoading, setGroupSettingsLoading] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [selectedStatusUser, setSelectedStatusUser] = useState<any>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStarPopup, setShowStarPopup] = useState(false);
  const [starTab, setStarTab] = useState<'quick' | 'template' | 'broadcast' | 'schedule' | 'repeat'>('quick');
  const [broadcastChats, setBroadcastChats] = useState<Set<string>>(new Set());
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [bridgeUrlInput, setBridgeUrlInput] = useState('');
  const [bridgeSecretInput, setBridgeSecretInput] = useState('');
  const [bridgeConfigured, setBridgeConfigured] = useState<boolean | null>(true); // Assume configured; fetchStatus will set to false if 422
  const [savingBridge, setSavingBridge] = useState(false);
  const [showBridgeSettings, setShowBridgeSettings] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [reactingToMsg, setReactingToMsg] = useState<string | null>(null);
  const [showMsgActions, setShowMsgActions] = useState<string | null>(null);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [contactAbout, setContactAbout] = useState<string | null>(null);
  const [showMergeGroups, setShowMergeGroups] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeSourceIds, setMergeSourceIds] = useState<Set<string>>(new Set());
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeProgressText, setMergeProgressText] = useState('');
  const [mergeResult, setMergeResult] = useState<{ targetName: string; existingCount: number; newCount: number } | null>(null);
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    if (typeof window !== 'undefined') { try { const v = localStorage.getItem('crm_pinnedChats'); if (v) return JSON.parse(v); } catch {} } return [];
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') { try { const v = localStorage.getItem('crm_sidebarWidth'); if (v) return parseInt(v, 10); } catch {} } return 416;
  });
  const [senderDisplayName, setSenderDisplayName] = useState(() => {
    if (typeof window !== 'undefined') { try { return localStorage.getItem('crm_senderDisplayName') || ''; } catch {} } return '';
  });
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState(() => {
    if (typeof window !== 'undefined') { try { return localStorage.getItem('crm_qrConnectedPhoneNumber') || ''; } catch {} } return '';
  });
  const [isPageVisible, setIsPageVisible] = useState(true);

  // All refs must come before any hooks
  const presenceSubRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const profilePicLoadedRef = useRef<Set<string>>(new Set());
  const readChatsRef = useRef<Map<string, number>>(new Map());
  const selectedChatRef = useRef(selectedChat);
  const currentUserIdRef = useRef(currentUserId);
  const isSuperAdminRef = useRef(isSuperAdminUser);
  const pinnedChatsRef = useRef(pinnedChats);
  const messengerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const tabRef = useRef(tab);
  const isResizing = useRef(false);
  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dbLoadedRef = useRef(false);
  const crmFetchRef = useRef(crmFetch);
  const pendingUpdatesRef = useRef<Record<string, any>>({});
  const connectedRef = useRef(false);
  const hasAutoSwitchedRef = useRef(false);
  const savedPhoneRef = useRef<string | null>(null);
  const profilePicLoadedRef2 = useRef<Set<string>>(new Set());
  const composerTextRef = useRef('');

  // Update refs with current state values
  selectedChatRef.current = selectedChat;
  currentUserIdRef.current = currentUserId;
  isSuperAdminRef.current = isSuperAdminUser;
  pinnedChatsRef.current = pinnedChats;
  tabRef.current = tab;
  crmFetchRef.current = crmFetch;
  connectedRef.current = !!status?.connected;
  composerTextRef.current = composerText;

  // ── Pause polling when browser tab is hidden ──
  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Define all remaining hooks BEFORE conditional JSX ──
  const saveToMongoDB = useCallback((updates: Record<string, any>) => {
    // Merge into pending updates (so chatFunnels + qrFunnelStages + etc. all go in one PUT)
    Object.assign(pendingUpdatesRef.current, updates);
    if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = setTimeout(async () => {
      const merged = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      try {
        console.log('[QR] Saving to MongoDB:', Object.keys(merged));
        // Use direct fetch to avoid useCRM auto-logout on errors
        const response = await fetch('/api/admin/crm/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(merged),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Save failed' }));
          console.warn(`[QR] Save failed: ${response.status}`, errData);
          // Show error to user if save fails
          setError(`Failed to save settings: ${errData.error || response.statusText}`);
          // Re-queue the failed update for retry
          Object.assign(pendingUpdatesRef.current, merged);
          return;
        }

        console.log('[QR] ✅ Saved to MongoDB:', Object.keys(merged));
        // Clear any previous save errors
        if (error && error.includes('Failed to save')) {
          setError(null);
        }
      } catch (e: any) {
        console.warn('[QR] ❌ Failed to save to MongoDB:', e);
        // Show error to user
        setError(`Failed to save settings: ${e?.message || 'Unknown error'}`);
        // Re-queue the failed update for retry
        Object.assign(pendingUpdatesRef.current, merged);
      }
    }, 500);
  }, [token, error]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    // Determine current user identity from localStorage
    let resolvedUserId = '';
    let superAdmin = false;
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;
      resolvedUserId = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : '') || '';
      if (userStr) {
        const u = JSON.parse(userStr);
        resolvedUserId = u?.userId || resolvedUserId;
        const perms = Array.isArray(u?.permissions) ? u.permissions : [];
        const pv2 = u?.permissionsV2 || null;
        // Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded)
        superAdmin = resolvedUserId === 'admin' || resolvedUserId === 'admincrm';
      }
    } catch {}
    setCurrentUserId(resolvedUserId);
    setIsSuperAdminUser(superAdmin);

    const loadFromDB = async () => {
      try {
        // ── Use direct fetch for initial settings load to avoid useCRM auto-logout on errors ──
        // If this fails, we fall back to defaults and continue (non-blocking)
        const settingsRes = await fetch('/api/admin/crm/settings', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then(r => {
          if (!r.ok && r.status === 401) {
            // Real auth issue — don't hide it, let caller handle
            throw new Error('Unauthorized');
          }
          return r.json().catch(() => null);
        }).catch(e => {
          console.warn('[QR] Settings fetch error:', e);
          return null;
        });

        if (!cancelled && settingsRes && settingsRes.success !== false) {
          // ── Unwrap apiSuccess wrapper: { success, data, timestamp } ──
          const s = settingsRes.data || settingsRes;

          // Load QR-specific funnel stages
          if (s.qrFunnelStages?.length > 0) {
            const allStage: FunnelStage = { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300' };
            const loaded: FunnelStage[] = s.qrFunnelStages
              .filter((s: any) => s.key !== 'all')
              .map((s: any) => ({ key: s.key, label: s.label, color: s.color }));
            setFunnelStages([allStage, ...loaded]);
          }
          // Load chat-to-funnel mappings
          if (s.chatFunnels && Object.keys(s.chatFunnels).length > 0) {
            setChatFunnels(s.chatFunnels);
          }
          // Load chat-to-label mappings
          if (s.chatLabels && Object.keys(s.chatLabels).length > 0) {
            setChatLabels(s.chatLabels);
          }
          // Load label presets
          if (s.labelPresets?.length > 0) {
            setLabelPresets(s.labelPresets);
          }
          // Load pinned chats
          if (s.pinnedChats?.length > 0) {
            setPinnedChats(s.pinnedChats);
          }
          // Load sender display name
          if (s.senderDisplayName) {
            setSenderDisplayName(s.senderDisplayName);
          }
          if (s.qrConnectedPhoneNumber) {
            setConnectedPhoneNumber(String(s.qrConnectedPhoneNumber));
          }
          // ── Load bridge URL and secret ──
          const savedUrl = s.qrBridgeUrl || '';
          const savedSecret = s.qrBridgeSecret || '';

          // Populate the settings inputs
          setBridgeUrlInput(savedUrl);
          setBridgeSecretInput(savedSecret);

          // ── Auto-provision bridge URL if missing ──
          // All users (including Super Admin) use /tenant/{permanentTenantId} pattern
          if (!savedUrl && token) {
            try {
              const provisionRes = await fetch('/api/admin/crm/whatsapp/qr/auto-provision', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }).then(r => {
                if (!r.ok) throw new Error(`Auto-provision failed: ${r.status}`);
                return r.json().catch(() => null);
              }).catch(e => {
                console.warn('[QR] Auto-provision error:', e);
                return null;
              });

              const pData = provisionRes?.data || provisionRes;
              if (pData?.success && pData?.bridgeUrl) {
                setBridgeUrlInput(pData.bridgeUrl);
                setBridgeSecretInput(pData.bridgeSecret);
                console.log('[QR] ✅ Auto-provisioned bridge URL for tenant');
              } else if (pData?.error) {
                console.warn('[QR] Auto-provision returned error:', pData.error);
                // Don't show error to user for auto-provision (non-critical)
              }
            } catch (e: any) {
              console.warn('[QR] Auto-provision failed (non-critical):', e);
              // Don't disrupt page load for auto-provision failures
            }
          }

          // All authenticated admin users can use QR WhatsApp
          // Bridge handles per-user isolation via x-user-id header
          setBridgeConfigured(true);
          console.log('[QR] ✅ Loaded settings from MongoDB — funnels:', s.qrFunnelStages?.length || 0, 'chatFunnels:', Object.keys(s.chatFunnels || {}).length, 'chatLabels:', Object.keys(s.chatLabels || {}).length, 'labels:', s.labelPresets?.length || 0, 'bridge:', savedUrl ? 'custom' : 'shared', 'user:', resolvedUserId);
        } else {
          // Settings load failed but still configure bridge with defaults
          setBridgeConfigured(true);
          console.log('[QR] Settings unavailable, using defaults');
        }
      } catch (e) {
        console.warn('[QR] Failed to load CRM settings, using defaults:', e);
        // Still mark as configured so QR page can work
        setBridgeConfigured(true);
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
  useEffect(() => {
    try { localStorage.setItem('crm_pinnedChats', JSON.stringify(pinnedChats)); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ pinnedChats });
  }, [pinnedChats, saveToMongoDB]);
  useEffect(() => {
    try { localStorage.setItem('crm_senderDisplayName', senderDisplayName); } catch {}
    if (dbLoadedRef.current) saveToMongoDB({ senderDisplayName });
  }, [senderDisplayName, saveToMongoDB]);
  useEffect(() => {
    try { localStorage.setItem('crm_qrConnectedPhoneNumber', connectedPhoneNumber); } catch {}
  }, [connectedPhoneNumber]);
  useEffect(() => {
    try { localStorage.setItem('crm_sidebarWidth', String(sidebarWidth)); } catch {}
  }, [sidebarWidth]);

  // ── Save bridge URL to user settings ──
  const saveBridgeConfig = useCallback(async () => {
    const url = bridgeUrlInput.trim().replace(/\/+$/, ''); // strip trailing slashes
    if (!url) { setError('Bridge URL is required'); return; }
    // Validate URL format — must be https:// or http://
    if (!/^https?:\/\//i.test(url)) {
      setError('Bridge URL must start with https:// or http:// (e.g. https://your-bridge.up.railway.app)');
      return;
    }
    setSavingBridge(true);
    try {
      // Use direct fetch to avoid useCRM auto-logout on errors
      const response = await fetch('/api/admin/crm/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrBridgeUrl: url,
          qrBridgeSecret: bridgeSecretInput.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed: ${response.status}`);
      }

      setBridgeConfigured(true);
      setShowBridgeSettings(false);
      setTab('connection');
      setError(null);
      // Force re-render so poll effect picks up the new bridge URL
      setLoading(true);
    } catch (e: any) {
      setError(e.message || 'Failed to save bridge URL');
    } finally {
      setSavingBridge(false);
    }
  }, [token, bridgeUrlInput, bridgeSecretInput]);

  // ── Bridge API calls via CRM proxy (using direct fetch to avoid useCRM auto-logout) ──
  const bridgeCall = useCallback(async (path: string, method = 'GET', body?: any) => {
    try {
      const url = new URL('/api/admin/crm/whatsapp/qr-bridge', window.location.origin);
      if (method === 'GET') {
        url.searchParams.append('path', path);
      }

      const response = await fetch(url.toString(), {
        method: method === 'GET' ? 'GET' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify({ action: method, path, body }) : undefined,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const serverMessage = errData.error || errData.message || '';

        if (response.status === 401) {
          throw new Error(serverMessage || 'Unauthorized — please log in again.');
        }

        if (response.status === 403) {
          throw new Error(serverMessage || 'Forbidden — you do not have access to this WhatsApp action.');
        }

        if (response.status === 404) {
          throw new Error(serverMessage || `Bridge endpoint not found: ${path}`);
        }

        throw new Error(serverMessage || `Bridge error: ${response.status}`);
      }

      const json = await response.json().catch(() => ({}));
      // Unwrap { success, data } wrapper from qr-bridge proxy
      return json.data || json;
    } catch (e: any) {
      // Handle bridge timeout/unreachable gracefully
      const msg = e?.message || String(e);
      if (msg.includes('timeout') || msg.includes('504')) {
        throw new Error('Bridge unreachable — is the Baileys service running?');
      }
      if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
        throw new Error('Cannot reach WhatsApp bridge — make sure it is running on port 3333');
      }
      // Detect "no bridge configured"
      if (msg.includes('bridge URL') || msg.includes('bridge configured')) {
        const noBridgeErr = new Error('NO_BRIDGE');
        (noBridgeErr as any).noBridge = true;
        throw noBridgeErr;
      }
      throw e;
    }
  }, [token]);

  // ── Poll status ──
  const fetchStatus = useCallback(async () => {
    try {
      const data = await bridgeCall('/status');
      setStatus(data);
      setError(null);

      if (data?.connected) {
        // Connected — clear QR
        setQrData(null);
        // Pre-fetch chats so inbox is ready when user switches
        if (tabRef.current === 'connection') {
          fetchChats();
        }
      } else if (data?.qrAvailable || data?.hasQr) {
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
      // ── No bridge configured → stay on Connection tab, show onboarding ──
      const msg = e?.message || '';
      if (msg === 'NO_BRIDGE' || msg.includes('bridge configured') || msg.includes('bridge URL') || e?.noBridge) {
        setBridgeConfigured(false);
        setError(null);
        setLoading(false);
        return;
      }
      // Don't clear QR on network errors — keep showing it
      setError(msg || 'Cannot reach WhatsApp bridge');
      setStatus(prev => prev || { connected: false, status: 'disconnected' });
    } finally {
      setLoading(false);
    }
  }, [bridgeCall]);

  // ── Poll setup ──
  // Use a stable interval — don't re-run the effect when status changes
  // (that would clear the interval mid-poll and cause status flickering)
  useEffect(() => {
    if (!token || bridgeConfigured !== true) return;
    fetchStatus();
    // Adaptive poll: check connectedRef inside setInterval instead of deps
    const id = setInterval(() => {
      fetchStatus();
    }, connectedRef.current ? 15000 : 10000);
    pollRef.current = id;
    return () => {
      clearInterval(id);
      pollRef.current = null;
    };
  }, [token, fetchStatus, bridgeConfigured]);
  // ── Auto-switch to inbox when connected ──
  useEffect(() => {
    // Only auto-switch once per session when first connected
    if (status?.connected && tab === 'connection' && !hasAutoSwitchedRef.current) {
      hasAutoSwitchedRef.current = true;
      fetchChats();
      setTab('inbox');
    }
  }, [status?.connected, tab]);

  // ── Save connected phone number to settings ──
  useEffect(() => {
    // When status shows we're connected AND has phone info, save it
    if (status?.connected && status?.phone?.id && status.phone.id !== savedPhoneRef.current) {
      savedPhoneRef.current = status.phone.id;
      // Strip phone to digits only (same as server-side extractBridgePhone)
      const cleanPhone = String(status.phone.id).split(':')[0].split('@')[0].replace(/\D/g, '');
      if (!cleanPhone) return;
      setConnectedPhoneNumber(cleanPhone);
      // Save to DB in background using direct fetch (non-critical)
      if (token) {
        fetch('/api/admin/crm/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ qrConnectedPhoneNumber: cleanPhone }),
        }).catch(e => console.warn('[QR] Failed to save connected phone:', e));
      }
    }
  }, [status?.connected, status?.phone?.id, token]);

  // ── Auto-fetch WhatsApp statuses when connected and on status tab ──
  useEffect(() => {
    if (status?.connected && tab === 'connection' && statusData.length === 0) {
      fetchStatuses();
    }
  }, [status?.connected, tab]);

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

  // ── Fetch chats (bridge + CRM leads merge) ──
  const fetchChats = useCallback(async () => {
    try {
      const isSuperUser = isSuperAdminRef.current;
      const userId = currentUserIdRef.current;

      // ── STEP 1: Fetch bridge chats (with error handling) ──
      let data: any = null;
      try {
        data = await bridgeCall('/chats');
      } catch (bridgeErr: any) {
        throw bridgeErr;
      }

      // ── SESSION CHANGED: server detected phone change, chats cleared ──
      if (data?.sessionChanged) {
        console.log('[QR] Session changed detected — chats cleared by server. Reload to see new chats.');
        setChats([]);
        return;
      }

      // ── STEP 2: Fetch CRM leads for enrichment (leads API filters per-user automatically) ──
      const crmLeadMap = new Map<string, { name: string; phone: string; funnelStage?: string; labels?: string[]; status?: string }>();
      try {
        // Use direct fetch to avoid useCRM auto-logout
        const leadsRes = await fetch('/api/admin/crm/leads?selectAll=true&limit=5000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then(r => r.json().catch(() => null))
          .catch(() => null);

        console.log('[QR] Fetched CRM leads for enrichment:', leadsRes?.data?.leads?.length || 0);
        if (leadsRes?.data?.leads) {
          for (const lead of leadsRes.data.leads) {
            if (lead.phoneNumber) {
              // Normalize phone: strip all non-digits
              let p = String(lead.phoneNumber).replace(/[^0-9]/g, '');
              // Handle various formats
              if (p.startsWith('0')) p = p.slice(1); // Remove leading 0
              if (p.length === 10) {
                // 10-digit Indian number without country code
                crmLeadMap.set(p, {
                  name: lead.name || lead.phoneNumber,
                  phone: p,
                  funnelStage: lead.funnelStage,
                  labels: lead.labels,
                  status: lead.status,
                });
                crmLeadMap.set('91' + p, { name: lead.name || lead.phoneNumber, phone: '91' + p, funnelStage: lead.funnelStage, labels: lead.labels, status: lead.status });
              } else if (p.length === 12 && p.startsWith('91')) {
                // 12-digit with 91 prefix
                crmLeadMap.set(p, {
                  name: lead.name || lead.phoneNumber,
                  phone: p,
                  funnelStage: lead.funnelStage,
                  labels: lead.labels,
                  status: lead.status,
                });
                crmLeadMap.set(p.slice(2), { name: lead.name || lead.phoneNumber, phone: p, funnelStage: lead.funnelStage, labels: lead.labels, status: lead.status });
              } else if (p.length === 11 && p.startsWith('0')) {
                // 11-digit starting with 0 (old format)
                const tenDigit = p.slice(1);
                crmLeadMap.set(tenDigit, { name: lead.name || lead.phoneNumber, phone: tenDigit, funnelStage: lead.funnelStage, labels: lead.labels, status: lead.status });
                crmLeadMap.set('91' + tenDigit, { name: lead.name || lead.phoneNumber, phone: '91' + tenDigit, funnelStage: lead.funnelStage, labels: lead.labels, status: lead.status });
              } else {
                // Other formats - just store as-is
                crmLeadMap.set(p, {
                  name: lead.name || lead.phoneNumber,
                  phone: p,
                  funnelStage: lead.funnelStage,
                  labels: lead.labels,
                  status: lead.status,
                });
              }
            }
          }
        }
        console.log('[QR] CRM lead map entries:', crmLeadMap.size);
      } catch (e) {
        console.error('[QR] Failed to fetch CRM leads for enrichment:', e);
        // Continue without enrichment
      }

      if (data?.chats) {
        // Deduplicate: merge LID and phone JIDs for the same contact
        const phoneMap = new Map<string, ChatItem>();
        const matchedCrmPhones = new Set<string>();
        const deduped: ChatItem[] = [];
        for (const c of data.chats as any[]) {
          // Bridge returns lastMessage as { body, timestamp, fromMe } — map to ChatItem format
          if (c.lastMessage && typeof c.lastMessage === 'object') {
            const lm = c.lastMessage;
            // Extract lastMessageTime from the nested object's timestamp or fallback to conversationTimestamp
            const ts = lm.timestamp || c.conversationTimestamp;
            c.lastMessageTime = ts ? new Date((ts > 1e12 ? ts : ts * 1000)).toISOString() : null;
            // Extract body text
            c.lastMessage = lm.body || lm.conversation || lm.extendedTextMessage?.text || '';
          } else if (c.lastMessage && typeof c.lastMessage !== 'string') {
            c.lastMessage = '';
          }
          // Set lastMessageTime from conversationTimestamp if not already set
          if (!c.lastMessageTime && c.conversationTimestamp) {
            const ts = c.conversationTimestamp;
            c.lastMessageTime = new Date((ts > 1e12 ? ts : ts * 1000)).toISOString();
          }
          if (c.isGroup) {
            deduped.push(c);
            continue;
          }
          // Extract phone from resolvedPhone, name, or JID
          const phone = extractBestChatPhone(c);

          // Enrich name from CRM lead if available
          if (phone) {
            const crmLead = crmLeadMap.get(phone);
            if (crmLead) {
              // Use CRM lead name if bridge only has a placeholder/internal name
              if (isPlaceholderChatName(c.name)) {
                c.name = crmLead.name;
              }
              if (!c.resolvedPhone) c.resolvedPhone = crmLead.phone;
              if (crmLead.funnelStage) c.funnelStage = crmLead.funnelStage;
              if (crmLead.labels?.length) c.labels = crmLead.labels;
              if (crmLead.status) c.leadStatus = crmLead.status;
              matchedCrmPhones.add(phone);
              // Mark other phone variants as matched
              if (phone.length === 12 && phone.startsWith('91')) matchedCrmPhones.add(phone.slice(2));
              if (phone.length === 10) matchedCrmPhones.add('91' + phone);
            }
          }

          if (phone && phoneMap.has(phone)) {
            // Merge: keep the entry with more recent message, combine unread counts
            const existing = phoneMap.get(phone)!;
            const eTime = existing.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0;
            const cTime = c.lastMessageTime ? new Date(c.lastMessageTime).getTime() : 0;
            if (cTime > eTime) {
              // current chat is newer — replace but merge unread
              c.unreadCount = (c.unreadCount || 0) + (existing.unreadCount || 0);
              // Transfer read status from the dropped JID to the surviving one
              const droppedReadAt = readChatsRef.current.get(existing.id);
              if (droppedReadAt && !readChatsRef.current.has(c.id)) {
                readChatsRef.current.set(c.id, droppedReadAt);
              }
              phoneMap.set(phone, c);
              const idx = deduped.indexOf(existing);
              if (idx >= 0) deduped[idx] = c;
            } else {
              existing.unreadCount = (existing.unreadCount || 0) + (c.unreadCount || 0);
              // Transfer read status from the dropped JID to the surviving one
              const droppedReadAt = readChatsRef.current.get(c.id);
              if (droppedReadAt && !readChatsRef.current.has(existing.id)) {
                readChatsRef.current.set(existing.id, droppedReadAt);
              }
            }
          } else {
            if (phone) phoneMap.set(phone, c);
            deduped.push(c);
          }
        }

        // Add CRM leads that don't have a matching QR chat as placeholder items
        for (const [phone, lead] of crmLeadMap) {
          if (matchedCrmPhones.has(phone)) continue;
          if (phone.length === 10 && matchedCrmPhones.has('91' + phone)) continue;
          if (phone.length === 12 && phone.startsWith('91') && matchedCrmPhones.has(phone.slice(2))) continue;
          if (phone.length === 10 && crmLeadMap.has('91' + phone)) continue;
          
          matchedCrmPhones.add(phone);
          if (phone.length === 12 && phone.startsWith('91')) matchedCrmPhones.add(phone.slice(2));
          if (phone.length === 10) matchedCrmPhones.add('91' + phone);
          
          const jid = (phone.length === 10 ? '91' + phone : phone) + '@s.whatsapp.net';
          deduped.push({
            id: jid,
            name: lead.name,
            isGroup: false,
            resolvedPhone: lead.phone,
            unreadCount: 0,
            lastMessageTime: null,
            lastMessage: '',
            funnelStage: lead.funnelStage,
            labels: lead.labels,
          });
        }

        // Preserve unreadCount=0 only if no NEW messages arrived since the user read the chat
        for (const c of deduped) {
          const readAt = readChatsRef.current.get(c.id);
          if (readAt) {
            const lastMsgTime = c.lastMessageTime ? new Date(c.lastMessageTime).getTime() : 0;
            if (lastMsgTime <= readAt) {
              // No new messages since the user read — keep as read
              c.unreadCount = 0;
            } else {
              // New message came in after reading — remove from readChatsRef so we show the real count
              readChatsRef.current.delete(c.id);
            }
          }
          // Also clear unread for the currently selected chat (always show as read)
          if (c.id === selectedChatRef.current) {
            c.unreadCount = 0;
          }
        }

        const sorted = deduped.sort((a, b) => {
          // Pinned chats always on top
          const pa = pinnedChatsRef.current.includes(a.id) ? 1 : 0;
          const pb = pinnedChatsRef.current.includes(b.id) ? 1 : 0;
          if (pa !== pb) return pb - pa;
          // Unread chats float below pinned but above read
          const ua = (a.unreadCount || 0) > 0 ? 1 : 0;
          const ub = (b.unreadCount || 0) > 0 ? 1 : 0;
          if (ua !== ub) return ub - ua;
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
  }, [bridgeCall, fetchProfilePic, token]);

  // ── Auto-refresh chat list every 15s when connected, on inbox tab & page visible ──
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (tab === 'inbox' && status?.connected && isPageVisible) {
      chatPollRef.current = setInterval(fetchChats, 15000);
    } else {
      if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; }
    }
    return () => { if (chatPollRef.current) { clearInterval(chatPollRef.current); chatPollRef.current = null; } };
  }, [tab, status?.connected, fetchChats, isPageVisible]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (jid: string) => {
    try {
      const data = await bridgeCall(`/messages/${jid}`);
      if (data?.messages) {
        // Map bridge response fields to frontend MessageItem format
        const mapped = data.messages.map((m: any) => ({
          id: m.id || m.key?.id || '',
          from: m.from || m.author || m.key?.participant || m.key?.remoteJid || '',
          fromMe: m.fromMe ?? m.key?.fromMe ?? false,
          text: m.text || m.body || '',
          type: m.type || 'text',
          timestamp: m.timestamp || 0,
          status: m.status || 0,
          participant: m.participant || m.key?.participant || '',
          pushName: m.pushName || '',
          hasMedia: m.hasMedia || false,
          mediaUrl: m.mediaUrl || null,
          mediaMimetype: m.mediaMimetype || null,
          mediaFileName: m.mediaFileName || null,
          quoted: m.quoted || null,
          reactions: m.reactions || {},
          quotedId: m.quotedId || null,
        }));
        setMessages(mapped);
        setTimeout(() => {
          messengerRef.current?.scrollTo({ top: messengerRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  }, [bridgeCall]);

  // ── Auto-refresh messages every 8s for active conversation (paused when tab hidden) ──
  const msgPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (selectedChat && status?.connected && isPageVisible) {
      msgPollRef.current = setInterval(() => fetchMessages(selectedChat), 8000);
    } else {
      if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; }
    }
    return () => { if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; } };
  }, [selectedChat, status?.connected, fetchMessages, isPageVisible]);

  // ── Poll presence for active non-group chat ──
  const presencePollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (presencePollRef.current) { clearInterval(presencePollRef.current); presencePollRef.current = null; }
    if (selectedChat && status?.connected && !selectedChat.endsWith('@g.us') && !selectedChat.endsWith('@lid')) {
      const poll = () => {
        bridgeCall(`/presence/${encodeURIComponent(selectedChat)}`).then((d: any) => {
          if (d && presenceSubRef.current === selectedChat) setChatPresence({ presence: d.presence, lastSeen: d.lastSeen });
        }).catch(() => {});
      };
      presencePollRef.current = setInterval(poll, 10000);
    }
    return () => { if (presencePollRef.current) { clearInterval(presencePollRef.current); presencePollRef.current = null; } };
  }, [selectedChat, status?.connected, bridgeCall]);

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

  // ── Fetch contact about/bio ──
  const fetchContactAbout = useCallback(async (jid: string) => {
    try {
      const data = await bridgeCall(`/contact-about/${encodeURIComponent(jid)}`);
      setContactAbout(data?.about || null);
    } catch {
      setContactAbout(null);
    }
  }, [bridgeCall]);

  // ── Select chat ──
  const selectChat = useCallback((jid: string) => {
    setSelectedChat(jid);
    setDetailsPanel(false);
    setGroupInfo(null);
    setReplyingTo(null);
    setReactingToMsg(null);
    setShowMsgActions(null);
    setContactAbout(null);
    setChatPresence(null);
    fetchMessages(jid);
    fetchProfilePic(jid);
    // Fetch contact about/bio for non-group chats
    if (!jid.endsWith('@g.us')) fetchContactAbout(jid);
    // Subscribe to presence for non-group chats
    if (!jid.endsWith('@g.us') && !jid.endsWith('@lid')) {
      presenceSubRef.current = jid;
      bridgeCall(`/presence/subscribe/${encodeURIComponent(jid)}`, 'POST').catch(() => {});
      // Fetch initial presence
      bridgeCall(`/presence/${encodeURIComponent(jid)}`).then((d: any) => {
        if (d && presenceSubRef.current === jid) setChatPresence({ presence: d.presence, lastSeen: d.lastSeen });
      }).catch(() => {});
    } else {
      presenceSubRef.current = null;
    }
    // Track when the user read this chat so polling can distinguish new messages vs already-read
    readChatsRef.current.set(jid, Date.now());
    // Tell the bridge to reset unread count on its side too
    bridgeCall(`/read/${encodeURIComponent(jid)}`, 'POST').catch(() => {});
    // Clear unread count and re-sort so read chat moves below unread ones
    setChats(prev => {
      const updated = prev.map(c => c.id === jid ? { ...c, unreadCount: 0 } : c);
      return updated.sort((a, b) => {
        const pa = pinnedChatsRef.current.includes(a.id) ? 1 : 0;
        const pb = pinnedChatsRef.current.includes(b.id) ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const ua = (a.unreadCount || 0) > 0 ? 1 : 0;
        const ub = (b.unreadCount || 0) > 0 ? 1 : 0;
        if (ua !== ub) return ub - ua;
        const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tb - ta;
      });
    });
  }, [fetchMessages, fetchProfilePic, fetchContactAbout, bridgeCall]);

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
        // Send text (with optional reply)
        if (replyingTo) {
          await bridgeCall('/reply', 'POST', {
            to,
            message: composerText.trim(),
            quotedId: replyingTo.id,
            quotedParticipant: replyingTo.participant,
          });
        } else {
          await bridgeCall('/send', 'POST', {
            to,
            message: composerText.trim(),
            type: 'text',
          });
        }
      }
      const hadMedia = !!mediaPreview;
      setComposerText('');
      setReplyingTo(null);
      // Refresh messages — longer delay for media (webhook needs time to upload & set CDN URL)
      setTimeout(() => fetchMessages(selectedChat), hadMedia ? 1500 : 500);
      // Double-refresh for media to catch async CDN URL updates from webhook
      if (hadMedia) setTimeout(() => fetchMessages(selectedChat), 4000);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [composerText, mediaPreview, selectedChat, sending, bridgeCall, fetchMessages, token, replyingTo]);

  // ── React to a message ──
  const handleReaction = useCallback(async (messageId: string, emoji: string, participant?: string) => {
    if (!selectedChat) return;
    try {
      await bridgeCall('/react', 'POST', { jid: selectedChat, messageId, emoji, participant });
      setReactingToMsg(null);
      // Update local message state immediately
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          const myJid = 'me';
          if (emoji) reactions[myJid] = emoji; else delete reactions[myJid];
          return { ...m, reactions };
        }
        return m;
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to react');
    }
  }, [selectedChat, bridgeCall]);

  // ── Delete a message ──
  const handleDeleteMessage = useCallback(async (msg: MessageItem, forEveryone: boolean) => {
    if (!selectedChat) return;
    try {
      await bridgeCall('/delete-message', 'POST', {
        jid: selectedChat,
        messageId: msg.id,
        participant: msg.participant,
        forEveryone,
      });
      setShowMsgActions(null);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (e: any) {
      setError(e.message || 'Failed to delete message');
    }
  }, [selectedChat, bridgeCall]);

  // ── Create a new group ──
  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const members = newGroupMembers.split(/[,;\n]+/).map(m => m.trim()).filter(Boolean);
      if (members.length === 0) { setError('Add at least one member phone number'); setCreatingGroup(false); return; }
      const result = await bridgeCall('/group-create', 'POST', { subject: newGroupName.trim(), participants: members });
      setShowGroupCreate(false);
      setNewGroupName('');
      setNewGroupMembers('');
      // Switch to the new group
      if (result?.id) {
        setTab('inbox');
        fetchChats();
        setTimeout(() => selectChat(result.id), 1000);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  }, [newGroupName, newGroupMembers, creatingGroup, bridgeCall, fetchChats, selectChat]);

  // ── Merge groups into a target group ──
  const handleMergeGroups = useCallback(async () => {
    if (!mergeTargetId || mergeSourceIds.size === 0 || mergeBusy) return;
    setMergeBusy(true);
    setMergeProgress(0);
    setMergeProgressText('Fetching target group info…');
    setMergeResult(null);
    try {
      // 1. Get target group info & existing participants
      const targetInfo = await bridgeCall(`/group-info/${mergeTargetId}`) as { subject?: string; participants?: { id: string }[] };
      const targetName = targetInfo?.subject || 'Target Group';
      const existingIds = new Set((targetInfo?.participants || []).map((p: { id: string }) => p.id));
      const existingCount = existingIds.size;
      setMergeProgress(10);

      // 2. Collect unique participants from all source groups
      const sourceArr = Array.from(mergeSourceIds).filter(id => id !== mergeTargetId);
      const allNewJids: string[] = [];
      for (let i = 0; i < sourceArr.length; i++) {
        setMergeProgressText(`Fetching group ${i + 1}/${sourceArr.length}…`);
        try {
          const info = await bridgeCall(`/group-info/${sourceArr[i]}`) as { participants?: { id: string }[] };
          const members = (info?.participants || []).map((p: { id: string }) => p.id);
          for (const jid of members) {
            if (!existingIds.has(jid) && !allNewJids.includes(jid)) {
              allNewJids.push(jid);
            }
          }
        } catch {
          // skip failed group
        }
        setMergeProgress(10 + Math.round(((i + 1) / sourceArr.length) * 40));
      }

      if (allNewJids.length === 0) {
        setMergeResult({ targetName, existingCount, newCount: 0 });
        setMergeProgress(100);
        setMergeProgressText('Done — no new members to add.');
        setMergeBusy(false);
        return;
      }

      // 3. Add participants in batches of 20
      const batchSize = 20;
      let added = 0;
      for (let i = 0; i < allNewJids.length; i += batchSize) {
        const batch = allNewJids.slice(i, i + batchSize);
        setMergeProgressText(`Adding members ${i + 1}–${Math.min(i + batchSize, allNewJids.length)} of ${allNewJids.length}…`);
        try {
          await bridgeCall(`/group-participants/${mergeTargetId}`, 'POST', {
            action: 'add',
            participants: batch,
          });
          added += batch.length;
        } catch {
          // some may fail (privacy settings etc)
        }
        setMergeProgress(50 + Math.round(((i + batchSize) / allNewJids.length) * 50));
      }

      setMergeProgress(100);
      setMergeProgressText('Merge complete!');
      setMergeResult({ targetName, existingCount, newCount: added });
      fetchChats();
    } catch (e: any) {
      setMergeProgressText(`Error: ${e.message || 'Merge failed'}`);
    } finally {
      setMergeBusy(false);
    }
  }, [mergeTargetId, mergeSourceIds, mergeBusy, bridgeCall, fetchChats]);

  // ── Start a new chat with phone number ──
  const handleStartNewChat = useCallback(() => {
    if (!newChatPhone.trim()) return;
    // Normalize phone: remove non-digits, add 91 if 10 digits
    let phone = newChatPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    if (phone.length < 10) { setError('Invalid phone number'); return; }
    // Select this chat (will create if not exists when user sends a message)
    const chatId = phone + '@c.us';
    setSelectedChat(chatId);
    setShowNewChat(false);
    setNewChatPhone('');
    // Try to fetch messages (might be empty for new chat)
    fetchMessages(chatId);
  }, [newChatPhone, fetchMessages]);

  // ── Leave group ──
  const handleLeaveGroup = useCallback(async () => {
    if (!selectedChat?.endsWith('@g.us')) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await bridgeCall(`/group-leave/${encodeURIComponent(selectedChat)}`, 'POST');
      setSelectedChat(null);
      setMessages([]);
      fetchChats();
    } catch (e: any) {
      setError(e.message || 'Failed to leave group');
    }
  }, [selectedChat, bridgeCall, fetchChats]);

  // ── Rename group ──
  const handleRenameGroup = useCallback(async (newName: string) => {
    if (!selectedChat?.endsWith('@g.us') || !newName.trim()) return;
    try {
      await bridgeCall(`/group-update-subject/${encodeURIComponent(selectedChat)}`, 'POST', { subject: newName.trim() });
      setGroupInfo(prev => prev ? { ...prev, subject: newName.trim() } : prev);
      fetchChats();
    } catch (e: any) {
      setError(e.message || 'Failed to rename group');
    }
  }, [selectedChat, bridgeCall, fetchChats]);

  // ── Send typing indicator ──
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleTyping = useCallback(() => {
    if (!selectedChat) return;
    bridgeCall('/typing', 'POST', { jid: selectedChat, composing: true }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      bridgeCall('/typing', 'POST', { jid: selectedChat, composing: false }).catch(() => {});
    }, 3000);
  }, [selectedChat, bridgeCall]);

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
      setTab('connection');
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
      setTab('connection');
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

  // ── Pin / Unpin chat (max 5) ──
  const togglePinChat = useCallback((chatId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(chatId)) return prev.filter(id => id !== chatId);
      if (prev.length >= 5) return prev; // max 5 pinned
      return [...prev, chatId];
    });
  }, []);

  // ── Filter chats by funnel + label + chatFilter + search ──
  const filteredChats = chats.filter(c => {
    // Apply funnel filter
    if (activeFunnel !== 'all' && chatFunnels[c.id] !== activeFunnel) return false;
    // Apply label filter
    if (activeLabel !== 'all') {
      const cls = chatLabels[c.id] || [];
      if (!cls.includes(activeLabel)) return false;
    }
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
      const lastMsg = (typeof c.lastMessage === 'string' ? c.lastMessage : '').toLowerCase();
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
  const headerConnectedPhone = formatPhoneNumber(
    String(status?.phone?.id || connectedPhoneNumber || '').split(':')[0].split('@')[0]
  );

  // ── Bridge setup onboarding / settings modal ──
  if (bridgeConfigured === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ Error Banner ═══ */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-2 text-red-600 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* ═══ Page Header ═══ */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Title + Status Badge + Sender + Compartment */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">QR WhatsApp</h1>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              isConnected ? 'bg-green-100 text-green-700 ring-1 ring-green-300 shadow-sm' :
              connState === 'connecting' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' :
              'bg-red-50 text-red-700 ring-1 ring-red-200'
            }`}>
              {isConnected ? <Wifi className="w-3.5 h-3.5 stroke-[3]" /> :
               connState === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
               <WifiOff className="w-3.5 h-3.5" />}
              {isConnected ? 'Connected' : connState === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>
            {headerConnectedPhone && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200" title={`Connected sender ${headerConnectedPhone}`}>
                <Phone className="w-3.5 h-3.5" />
                {headerConnectedPhone}
              </div>
            )}
            {/* User Compartment Indicator */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200" title={`Logged in as ${currentUserId}`}>
              <Lock className="w-2.5 h-2.5" />
              {isSuperAdminUser ? '👑 Admin' : currentUserId || 'User'}
            </div>
          </div>
          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button onClick={() => setShowNewChat(true)} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 flex items-center gap-1.5 transition" title="New Chat">
                  <Plus className="w-3.5 h-3.5" /> New Chat
                </button>
                <button onClick={() => setShowGroupCreate(true)} className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 transition" title="New Group">
                  <Users className="w-3.5 h-3.5" /> New Group
                </button>
                <button onClick={() => { setShowMergeGroups(true); setMergeTargetId(''); setMergeSourceIds(new Set()); setMergeResult(null); setMergeProgress(0); setMergeProgressText(''); }} className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition" title="Merge Groups">
                  <Merge className="w-3.5 h-3.5" /> Merge Group
                </button>
              </>
            )}
            <button onClick={() => { setShowStatusPanel(true); fetchStatuses(); }} className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition" title="View Statuses">
              <Radio className="w-3.5 h-3.5" /> Stories
            </button>
          </div>
        </div>

        {/* ═══ Tab Navigation ═══ */}
        <div className="px-4 flex items-center gap-1 border-t bg-gray-50/50">
          {([
            { key: 'connection' as const, label: 'Connection', icon: <QrCode className="w-3.5 h-3.5" />, desc: 'QR & Status' },
            { key: 'inbox' as const, label: 'Inbox', icon: <MessageSquare className="w-3.5 h-3.5" />, desc: `${chats.length} chats`, badge: chats.filter(c => c.unreadCount > 0).length },
            { key: 'settings' as const, label: 'Settings', icon: <Settings className="w-3.5 h-3.5" />, desc: 'Configure' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'inbox' && isConnected) fetchChats(); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.key
                  ? 'border-green-600 text-green-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.key === 'inbox' && (t.badge ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-600 text-white font-semibold">{t.badge}</span>
              )}
            </button>
          ))}

          {/* Funnel pills — visible only on inbox tab */}
          {tab === 'inbox' && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide ml-4 flex-1">
              {funnelStages.map(stage => {
                const count = stage.key === 'all'
                  ? chats.length
                  : chats.filter(c => chatFunnels[c.id] === stage.key).length;
                return (
                  <div key={stage.key} className="flex items-center flex-shrink-0 group">
                    <button
                      onClick={() => { setActiveFunnel(stage.key); setSelectedChats(new Set()); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition ${activeFunnel === stage.key ? stage.color + ' ring-1 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {stage.label}
                      <span className={`text-[10px] px-1 rounded-full ${activeFunnel === stage.key ? 'bg-white/60' : 'bg-gray-100'}`}>{count}</span>
                    </button>
                    {stage.key !== 'all' && (
                      <button onClick={() => openEditModal('funnel', 'edit', stage)} className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition" title="Edit">
                        <Pencil className="w-2.5 h-2.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button onClick={() => openEditModal('funnel', 'add')} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 whitespace-nowrap transition flex-shrink-0" title="Add funnel stage">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && error !== 'NO_BRIDGE' && !error.includes('bridge configured') && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm font-medium">×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Connecting to WhatsApp bridge...</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ CONNECTION TAB ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && tab === 'connection' && (
        <ConnectionTab
          isConnected={isConnected}
          connState={connState}
          qrData={qrData}
          status={status}
          connectedPhoneNumber={headerConnectedPhone}
          chats={chats}
          loadingStatuses={loadingStatuses}
          statusData={statusData}
          handleReconnect={handleReconnect}
          handleDisconnect={handleDisconnect}
          handleLogout={handleLogout}
          setTab={setTab}
          setShowGroupCreate={setShowGroupCreate}
          setShowStatusPanel={setShowStatusPanel}
          setSelectedStatusUser={setSelectedStatusUser}
          setCurrentStatusIndex={setCurrentStatusIndex}
          fetchStatuses={fetchStatuses}
          fetchChats={fetchChats}
        />
      )}
      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ SETTINGS TAB ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && tab === 'settings' && (
        <>
          <SettingsTab
          bridgeUrlInput={bridgeUrlInput}
          setBridgeUrlInput={setBridgeUrlInput}
          bridgeSecretInput={bridgeSecretInput}
          setBridgeSecretInput={setBridgeSecretInput}
          token={token}
          savingBridge={savingBridge}
          saveBridgeConfig={saveBridgeConfig}
          funnelStages={funnelStages}
          labelPresets={labelPresets}
          openEditModal={openEditModal}
          handleReconnect={handleReconnect}
          handleDisconnect={handleDisconnect}
          handleLogout={handleLogout}
          setShowExtensionModal={setShowExtensionModal}
          setShowInstallGuide={setShowInstallGuide}
          isSuperAdmin={isSuperAdminUser}
          currentUserId={currentUserId}
          crmFetch={crmFetch}
          senderDisplayName={senderDisplayName}
          setSenderDisplayName={setSenderDisplayName}
        />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ INBOX TAB ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && tab === 'inbox' && !isConnected && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-700">WhatsApp Not Connected</h2>
          <p className="text-sm text-gray-500">Connect your WhatsApp first to access the inbox</p>
          <button
            onClick={() => setTab('connection')}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Go to Connection
          </button>
        </div>
      )}
      {!loading && tab === 'inbox' && isConnected && (
        <div className="flex h-[calc(100vh-105px)]">
          {/* Chat List — full width on mobile, resizable sidebar on lg+ */}
          <div
            className={`bg-white flex flex-col border-r ${selectedChat ? 'hidden lg:flex' : 'flex'}`}
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : '100%', minWidth: 280, maxWidth: 600, flexShrink: 0 }}
          >
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
            {/* Label filter pills */}
            {labelPresets.length > 0 && (
              <div className="px-2 py-1 border-b flex items-center gap-1 overflow-x-auto scrollbar-hide bg-gray-50/50">
                <button
                  onClick={() => setActiveLabel('all')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap transition flex-shrink-0 ${
                    activeLabel === 'all'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  All Labels
                  <span className={`text-[9px] px-1 rounded-full ${activeLabel === 'all' ? 'bg-white/30' : 'bg-gray-100'}`}>
                    {Object.values(chatLabels).filter(l => l.length > 0).length}
                  </span>
                </button>
                {labelPresets.map(lp => {
                  const count = Object.values(chatLabels).filter(labels => labels.includes(lp.key)).length;
                  return (
                    <button
                      key={lp.key}
                      onClick={() => setActiveLabel(activeLabel === lp.key ? 'all' : lp.key)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap transition flex-shrink-0 ${
                        activeLabel === lp.key
                          ? lp.color + ' ring-1 ring-offset-1 ring-current border-current'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${lp.color.split(' ')[0]}`} />
                      {lp.label}
                      <span className={`text-[9px] px-1 rounded-full ${activeLabel === lp.key ? 'bg-white/60' : 'bg-gray-100'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Chat list header with actions */}
            <div className="px-2 py-1.5 border-b flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button onClick={selectAllChats} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600" title="Select all">
                  {selectedChats.size === filteredChats.length && filteredChats.length > 0 ? 'Deselect' : 'All'}
                </button>
                {selectedChats.size > 0 && (
                  <span className="text-[10px] text-indigo-600 font-medium">{selectedChats.size} selected</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {selectedChats.size > 0 && (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => { setShowBulkFunnel(!showBulkFunnel); setShowBulkLabel(false); }}
                        className="px-1.5 py-0.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-600 border border-indigo-200 flex items-center gap-0.5"
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
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-indigo-600 flex items-center gap-1"
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
                    className={`group w-full text-left px-2 py-2 border-b hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer ${
                      selectedChat === chat.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => selectChat(chat.id)}
                  >
                    {/* Checkbox — always visible */}
                    <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleChatSelection(chat.id); }}>
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-indigo-600" />
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
                        <span className="absolute -bottom-0.5 -right-0.5 bg-indigo-500 rounded-full w-3.5 h-3.5 flex items-center justify-center border-2 border-white">
                          <Users className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                          {chat.isGroup && <Users className="w-3 h-3 text-indigo-500 flex-shrink-0" />}
                          {getSidebarChatTitle(chat)}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Label dots — colored circles, hover to see name */}
                          {chatLabelList.length > 0 && (
                            <div className="flex items-center -space-x-0.5">
                              {chatLabelList.slice(0, 3).map(lbl => {
                                const li = labelPresets.find(l => l.key === lbl);
                                if (!li) return null;
                                return (
                                  <span
                                    key={lbl}
                                    title={li.label}
                                    onClick={(e) => { e.stopPropagation(); setActiveLabel(activeLabel === li.key ? 'all' : li.key); }}
                                    className={`w-3 h-3 rounded-full border border-white cursor-pointer hover:scale-125 transition-transform ${li.color.split(' ')[0]}`}
                                  />
                                );
                              })}
                              {chatLabelList.length > 3 && (
                                <span className="text-[8px] text-gray-400 ml-0.5">+{chatLabelList.length - 3}</span>
                              )}
                            </div>
                          )}
                          {chat.unreadCount > 0 && chat.id !== selectedChat && (
                            <span className="bg-green-500 text-white text-[9px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-medium">
                              {chat.unreadCount}
                            </span>
                          )}
                          {timeStr && <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeStr}</span>}
                        </div>
                      </div>
                      {/* Funnel stage + labels + lead status row */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {/* Lead status badge */}
                        {chat.leadStatus && (
                          <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${
                            chat.leadStatus === 'enrolled' ? 'bg-green-100 text-green-700 border border-green-300' :
                            chat.leadStatus === 'interested' || chat.leadStatus === 'hot' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                            chat.leadStatus === 'contacted' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                            chat.leadStatus === 'new_lead' || chat.leadStatus === 'lead' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                            chat.leadStatus === 'prospect' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            chat.leadStatus === 'inactive' ? 'bg-gray-100 text-gray-500 border border-gray-300' :
                            'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}>
                            {chat.leadStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
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
                          <p className="text-[10px] text-gray-400 truncate flex-1">
                            {String(chat.lastMessage).substring(0, 35)}
                          </p>
                        )}
                        {/* Pin/unpin button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                          className={`ml-auto flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition ${pinnedChats.includes(chat.id) ? 'text-green-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
                          title={pinnedChats.includes(chat.id) ? 'Unpin chat' : (pinnedChats.length >= 5 ? 'Max 5 pinned chats' : 'Pin chat')}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5a.5.5 0 0 1-1 0V10h-4A.5.5 0 0 1 3 9.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resize handle between sidebar and message area */}
          <div
            className="hidden lg:block w-1 hover:w-1.5 bg-gray-200 hover:bg-green-400 cursor-col-resize transition-all flex-shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              isResizing.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              const onMouseMove = (ev: MouseEvent) => {
                if (!isResizing.current) return;
                const newWidth = Math.min(600, Math.max(280, startWidth + ev.clientX - startX));
                setSidebarWidth(newWidth);
              };
              const onMouseUp = () => {
                isResizing.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />

          {/* Message Area — hidden on mobile when no chat selected */}
          <div className={`flex-1 flex flex-col bg-gray-100 ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>
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
                      // For non-group chats: prefer CRM lead name (set during enrichment) over raw phone
                      const crmName = selectedChatInfo?.name && !/^\d+$/.test(selectedChatInfo.name) ? selectedChatInfo.name : null;
                      const headerDisplayName = isGroupChat
                        ? (selectedChatInfo?.name || selectedChat.split('@')[0])
                        : (crmName || selectedChatInfo?.resolvedPhone || selectedChat.replace('@s.whatsapp.net', ''));
                      const chatName = isGroupChat
                        ? (selectedChatInfo?.name || selectedChat.split('@')[0])
                        : (crmName || selectedChat.replace('@s.whatsapp.net', ''));
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
                              {isGroupChat && <Users className="w-3 h-3 text-indigo-500 flex-shrink-0" />}
                              <p className="font-medium text-sm truncate">{isGroupChat ? headerDisplayName : formatPhoneNumber(headerDisplayName)}</p>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {/* Online/offline/last seen for non-group chats */}
                              {!isGroupChat && chatPresence && (
                                <span className={`text-[9px] font-medium ${chatPresence.presence === 'available' ? 'text-green-600' : chatPresence.presence === 'composing' ? 'text-green-600' : chatPresence.presence === 'recording' ? 'text-green-600' : 'text-gray-400'}`}>
                                  {chatPresence.presence === 'available' ? '● online'
                                    : chatPresence.presence === 'composing' ? '● typing...'
                                    : chatPresence.presence === 'recording' ? '● recording...'
                                    : chatPresence.lastSeen ? `last seen ${new Date(chatPresence.lastSeen * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                    : 'offline'}
                                </span>
                              )}
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
                      className="p-1.5 rounded-full hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition"
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDetailsPanel(selectedChat)}
                      className={`p-1.5 rounded-full hover:bg-gray-100 transition ${detailsPanel ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`}
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
                    const reactionEntries = msg.reactions ? Object.entries(msg.reactions).filter(([, v]) => v) : [];
                    return (
                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} group/msg relative`}>
                      {/* Message action buttons — visible on hover */}
                      <div className={`absolute ${msg.fromMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} top-1 hidden group-hover/msg:flex items-center gap-0.5 z-10`}>
                        <button onClick={() => setReplyingTo(msg)} className="p-1 rounded-full bg-white shadow hover:bg-gray-100" title="Reply">
                          <RotateCcw className="w-3 h-3 text-gray-500" />
                        </button>
                        <button onClick={() => setReactingToMsg(reactingToMsg === msg.id ? null : msg.id)} className="p-1 rounded-full bg-white shadow hover:bg-gray-100" title="React">
                          <Smile className="w-3 h-3 text-gray-500" />
                        </button>
                        {msg.fromMe && (
                          <button onClick={() => handleDeleteMessage(msg, true)} className="p-1 rounded-full bg-white shadow hover:bg-red-50" title="Delete for everyone">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(msg.text || ''); }} className="p-1 rounded-full bg-white shadow hover:bg-gray-100" title="Copy text">
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                      {/* Reaction picker popup */}
                      {reactingToMsg === msg.id && (
                        <div className={`absolute ${msg.fromMe ? 'right-0' : 'left-0'} -top-8 bg-white rounded-full shadow-lg border px-1.5 py-1 flex items-center gap-0.5 z-20`}>
                          {REACTION_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji, msg.participant)} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-lg transition">{emoji}</button>
                          ))}
                        </div>
                      )}
                      <div className={`${hasOnlyMedia && isImage ? 'max-w-[240px] sm:max-w-[320px]' : 'max-w-[85%] sm:max-w-[65%] min-w-[100px] sm:min-w-[120px]'} px-2.5 py-1.5 rounded-2xl text-sm shadow-sm ${
                        msg.fromMe
                          ? 'bg-[#d9fdd3] text-gray-900 rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md'
                      }`}>
                        {/* Quoted message (reply context) */}
                        {msg.quoted && (
                          <div className="mb-1.5 px-2 py-1 bg-black/5 rounded-lg border-l-2 border-green-500">
                            <p className="text-[10px] font-semibold text-green-700">{msg.quoted.participant?.split('@')[0] || 'Reply'}</p>
                            <p className="text-[11px] text-gray-600 line-clamp-2">{msg.quoted.text}</p>
                          </div>
                        )}
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
                              <a href={mediaDisplayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 group-hover:underline">
                                Download {msg.mediaFileName ? '' : 'document'}
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Fallback download button — only show when NO inline preview is available */}
                        {!hasMediaPreview && msg.hasMedia && (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'document') && (
                          <div className="mb-1.5 flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                               onClick={() => downloadMediaFromBridge(msg.id, msg.mediaFileName || undefined)}>
                            {msg.type === 'image' && <ImageIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            {msg.type === 'video' && <Video className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            {msg.type === 'audio' && <Mic className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            {msg.type === 'document' && <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            <span className="text-xs text-indigo-600 font-medium flex-1">
                              {downloadingMedia === msg.id ? (
                                <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                              ) : null}
                              {downloadingMedia === msg.id ? 'Downloading...' : `Download ${msg.mediaFileName ? '' : msg.type}`}
                            </span>
                          </div>
                        )}

                        {/* Type indicator for media without preview URL and no binary (stickers, etc.) */}
                        {msg.type && msg.type !== 'text' && msg.type !== 'conversation' && !hasMediaPreview && !(msg.hasMedia && (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'document')) && (
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
                          <p className="whitespace-pre-wrap break-words text-gray-400 italic text-sm">
                            {msg.type && msg.type !== 'text' && msg.type !== 'conversation' ? `[${msg.type}]` : '·'}
                          </p>
                        )}

                        <div className="text-[10px] text-gray-400 mt-1 text-right flex items-center justify-end gap-0.5">
                          {msg.fromMe && senderDisplayName && (
                            <>
                              <span className="font-bold text-gray-900 text-[11px]">{senderDisplayName}</span>
                              <span className="mx-0.5">·</span>
                            </>
                          )}
                          {msg.timestamp
                            ? new Date(typeof msg.timestamp === 'number' && msg.timestamp < 10000000000
                                ? msg.timestamp * 1000
                                : msg.timestamp
                              ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : ''}
                          {msg.fromMe && <MessageTicks status={msg.status} />}
                        </div>
                      </div>
                      {/* Reactions display */}
                      {reactionEntries.length > 0 && (
                        <div className={`absolute -bottom-3 ${msg.fromMe ? 'right-2' : 'left-2'} flex gap-0.5`}>
                          <div className="bg-white rounded-full shadow border px-1 py-0.5 flex items-center gap-0.5 text-xs">
                            {reactionEntries.slice(0, 5).map(([, emoji], i) => <span key={i}>{emoji}</span>)}
                            {reactionEntries.length > 5 && <span className="text-[9px] text-gray-400 ml-0.5">+{reactionEntries.length - 5}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />

                {/* Reply bar */}
                {replyingTo && (
                  <div className="bg-gray-50 border-t px-4 py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0 border-l-2 border-green-500 pl-2">
                      <p className="text-[10px] font-semibold text-green-700">{replyingTo.fromMe ? 'You' : (replyingTo.pushName || replyingTo.from)}</p>
                      <p className="text-xs text-gray-600 truncate">{replyingTo.text || `[${replyingTo.type}]`}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4 text-gray-500" /></button>
                  </div>
                )}

                {/* Media preview bar */}
                {mediaPreview && (
                  <div className="bg-gray-50 border-t px-4 py-2 flex items-center gap-3">
                    {mediaPreview.type.startsWith('image/') ? (
                      <img src={mediaPreview.base64} alt="preview" className="w-12 h-12 object-cover rounded" />
                    ) : mediaPreview.type.startsWith('video/') ? (
                      <div className="w-12 h-12 bg-indigo-100 rounded flex items-center justify-center"><Video className="w-5 h-5 text-indigo-600" /></div>
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
                      <button onClick={() => { handleFileSelect('video/*'); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Video className="w-4 h-4 text-indigo-600" /> Video</button>
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
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition"
                      title="Format text"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    {/* Text Input */}
                    <input
                      ref={composerInputRef}
                      type="text"
                      value={composerText}
                      onChange={e => { setComposerText(e.target.value); handleTyping(); }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                      onFocus={closeComposerPopups}
                      placeholder={replyingTo ? `Reply to ${replyingTo.pushName || replyingTo.from}...` : mediaPreview ? 'Add caption...' : 'Type a message...'}
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
          {detailsPanel && selectedChat && (
            <DetailsPanel
              selectedChat={selectedChat}
              chats={chats}
              messages={messages}
              profilePics={profilePics}
              isConnected={isConnected}
              contactAbout={contactAbout}
              chatFunnels={chatFunnels}
              chatLabels={chatLabels}
              funnelStages={funnelStages}
              labelPresets={labelPresets}
              groupInfo={groupInfo}
              loadingGroupInfo={loadingGroupInfo}
              editingDesc={editingDesc}
              setEditingDesc={setEditingDesc}
              editDescText={editDescText}
              setEditDescText={setEditDescText}
              savingDesc={savingDesc}
              updateGroupDesc={updateGroupDesc}
              groupInviteLink={groupInviteLink}
              loadingInvite={loadingInvite}
              fetchGroupInvite={fetchGroupInvite}
              revokeGroupInvite={revokeGroupInvite}
              groupSettingsLoading={groupSettingsLoading}
              updateGroupSetting={updateGroupSetting}
              updateGroupParticipant={updateGroupParticipant}
              handleRenameGroup={handleRenameGroup}
              handleLeaveGroup={handleLeaveGroup}
              setDetailsPanel={setDetailsPanel}
              setLightboxImage={setLightboxImage}
            />
          )}
        </div>
      )}

      {/* Extracted Modals / Panels */}
      {/* Extracted Modals / Panels */}
      <StatusPanel
        showStatusPanel={showStatusPanel}
        setShowStatusPanel={setShowStatusPanel}
        statusData={statusData}
        loadingStatuses={loadingStatuses}
        fetchStatuses={fetchStatuses}
        selectedStatusUser={selectedStatusUser}
        setSelectedStatusUser={setSelectedStatusUser}
        currentStatusIndex={currentStatusIndex}
        setCurrentStatusIndex={setCurrentStatusIndex}
        token={token}
      />
      <ExtensionModal
        showExtensionModal={showExtensionModal}
        setShowExtensionModal={setShowExtensionModal}
        handleDownloadInstaller={handleDownloadInstaller}
        downloadingExtension={downloadingExtension}
      />
      <InstallGuideModal showInstallGuide={showInstallGuide} setShowInstallGuide={setShowInstallGuide} />
      <EditFunnelLabelModal
        editModal={editModal}
        setEditModal={setEditModal}
        editName={editName}
        setEditName={setEditName}
        editColor={editColor}
        setEditColor={setEditColor}
        saveEditModal={saveEditModal}
        deleteFromModal={deleteFromModal}
      />
      <StarPopup
        showStarPopup={showStarPopup}
        setShowStarPopup={setShowStarPopup}
        starTab={starTab}
        setStarTab={setStarTab}
        setComposerText={setComposerText}
        broadcastChats={broadcastChats}
        setBroadcastChats={setBroadcastChats}
        broadcastText={broadcastText}
        setBroadcastText={setBroadcastText}
        broadcastSending={broadcastSending}
        broadcastSearch={broadcastSearch}
        setBroadcastSearch={setBroadcastSearch}
        chats={chats}
        handleBroadcastSend={handleBroadcastSend}
        selectedChat={selectedChat}
        token={token}
        crmFetch={crmFetch}
      />
      <Lightbox lightboxImage={lightboxImage} setLightboxImage={setLightboxImage} />
      <GroupCreateModal
        showGroupCreate={showGroupCreate}
        setShowGroupCreate={setShowGroupCreate}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroupMembers={newGroupMembers}
        setNewGroupMembers={setNewGroupMembers}
        creatingGroup={creatingGroup}
        handleCreateGroup={handleCreateGroup}
      />
      {/* Merge Groups Modal */}
      {showMergeGroups && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!mergeBusy) { setShowMergeGroups(false); setMergeResult(null); setMergeProgress(0); setMergeSourceIds(new Set()); setMergeTargetId(''); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-3.5 border-b flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
              <h3 className="font-semibold text-white flex items-center gap-2"><Merge className="w-5 h-5" /> Merge Groups</h3>
              <button onClick={() => { if (!mergeBusy) { setShowMergeGroups(false); setMergeResult(null); setMergeProgress(0); setMergeSourceIds(new Set()); setMergeTargetId(''); } }} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Result Summary */}
              {mergeResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
                  <div className="text-green-700 font-bold text-lg">✅ Successfully Merged!</div>
                  <div className="text-sm text-green-800"><span className="font-semibold">{mergeResult.targetName}</span> had <span className="font-bold">{mergeResult.existingCount}</span> users</div>
                  <div className="text-sm text-green-800"><span className="font-bold text-green-600">{mergeResult.newCount}</span> new members added from other groups</div>
                  <button onClick={() => { setShowMergeGroups(false); setMergeResult(null); setMergeProgress(0); setMergeSourceIds(new Set()); setMergeTargetId(''); }} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">Done</button>
                </div>
              )}
              {/* Select target group */}
              {!mergeResult && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Merge Into (Target Group)</label>
                    <select
                      value={mergeTargetId}
                      onChange={e => setMergeTargetId(e.target.value)}
                      disabled={mergeBusy}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:opacity-50"
                    >
                      <option value="">— Select target group —</option>
                      {chats.filter(c => c.isGroup).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(g => (
                        <option key={g.id} value={g.id}>{g.name || g.id}</option>
                      ))}
                    </select>
                  </div>
                  {/* Select source groups */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Groups to Merge From ({mergeSourceIds.size} selected)</label>
                    <div className="border rounded-lg max-h-52 overflow-y-auto divide-y">
                      {chats.filter(c => c.isGroup && c.id !== mergeTargetId).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(g => (
                        <label key={g.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 cursor-pointer transition ${mergeSourceIds.has(g.id) ? 'bg-amber-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={mergeSourceIds.has(g.id)}
                            disabled={mergeBusy}
                            onChange={() => {
                              setMergeSourceIds(prev => {
                                const next = new Set(prev);
                                if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                                return next;
                              });
                            }}
                            className="accent-amber-500 w-4 h-4"
                          />
                          <span className="text-sm text-gray-700 truncate">{g.name || g.id}</span>
                        </label>
                      ))}
                      {chats.filter(c => c.isGroup && c.id !== mergeTargetId).length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-400 text-sm">No other groups found</div>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {mergeBusy && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-300" style={{ width: `${mergeProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 text-center">{mergeProgressText}</p>
                    </div>
                  )}
                  {/* Submit */}
                  <button
                    onClick={handleMergeGroups}
                    disabled={!mergeTargetId || mergeSourceIds.size === 0 || mergeBusy}
                    className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {mergeBusy ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> Merging…</>
                    ) : (
                      <><Merge className="w-4 h-4" /> Merge {mergeSourceIds.size} Group{mergeSourceIds.size !== 1 ? 's' : ''} into Target</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-xl">
              <h3 className="font-semibold text-white flex items-center gap-2"><Plus className="w-5 h-5" /> New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Enter phone number to start a new chat</p>
              <input
                type="tel"
                autoFocus
                value={newChatPhone}
                onChange={e => setNewChatPhone(e.target.value)}
                placeholder="Phone number (e.g., 919876543210)"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                onKeyDown={e => { if (e.key === 'Enter') handleStartNewChat(); }}
              />
              <p className="text-[10px] text-gray-400">10 digits will auto-prefix with 91 (India)</p>
              <button
                onClick={handleStartNewChat}
                disabled={!newChatPhone.trim()}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
