'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';
import { QRConnectionModal } from '@/components/admin/crm/QRConnectionModal';
import { whatsappSetupLinks } from './page-links';

type ConversationRow = {
  leadId: string;
  leadNumber?: string;
  name?: string;
  status?: string;
  labels?: string[];
  assignedToUserId?: string;
  phoneNumber: string;
  lastMessageAt?: string;
  lastMessageContent?: string;
  lastDirection?: 'inbound' | 'outbound';
  lastStatus?: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  unreadCount?: number;
};

type PopulatedLead = { _id: string; name?: string; phoneNumber?: string };

type Message = {
  _id: string;
  leadId: string | PopulatedLead;
  phoneNumber: string;
  messageContent: string;
  messageType?: 'text' | 'template' | 'media' | 'interactive';
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
};

type QuickReply = {
  _id: string;
  title: string;
  shortcut?: string;
  content: string;
  enabled?: boolean;
};

type WhatsAppTemplateRow = {
  _id: string;
  templateName: string;
  category?: string;
  language?: string;
  templateContent: string;
  status?: string;
};

type AutomationRuleRow = {
  _id: string;
  name: string;
  enabled?: boolean;
  triggerType?: string;
  actionType?: string;
  actionText?: string;
  actionTemplateId?: string;
};

type LeadNote = {
  _id: string;
  note: string;
  pinned?: boolean;
  createdAt: string;
};

type LeadFollowUp = {
  _id: string;
  title?: string;
  description?: string;
  dueAt: string;
  status?: 'open' | 'done' | string;
  timezone?: string;
  createdAt: string;
};

function formatTime(dateLike?: string) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateLike?: string) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

// Simple spell check - detects basic misspellings
function checkSpelling(text: string): Array<{ word: string; index: number }> {
  const commonMisspellings: Record<string, boolean> = {
    'helo': true, 'wrld': true, 'thier': true, 'wich': true, 'recieve': true, 'occured': true,
    'begining': true, 'seperete': true, 'congradulate': true, 'succesful': true, 'wiht': true,
  };
  const errors: Array<{ word: string; index: number }> = [];
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  let currentIndex = 0;
  for (const word of words) {
    if (commonMisspellings[word.toLowerCase()]) {
      errors.push({ word, index: currentIndex });
    }
    currentIndex = text.indexOf(word, currentIndex) + word.length;
  }
  return errors;
}

// Format message for WhatsApp preview
function formatPreviewMessage(text: string): string {
  return text
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>') // Bold *text*
    .replace(/_(.+?)_/g, '<em>$1</em>') // Italic _text_
    .replace(/~(.+?)~/g, '<strike>$1</strike>'); // Strikethrough ~text~
}

// Emoji & Symbols Data
const EMOJI_COLLECTIONS = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙁', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🤨', '😷'],
  people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '👊', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🙏', '💅', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨'],
  nature: ['🌀', '🌁', '🌂', '🌃', '🌄', '🌅', '🌆', '🌇', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑'],
  food: ['🍕', '🍔', '🍟', '🍗', '🌭', '🍖', '🌮', '🌯', '🥙', '🧆', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕'],
  activity: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏂', '⛷️', '🎿', '⛸️', '🥌', '🎣', '🎽', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☔'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏎️', '🛵', '🦯', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🛼', '🚏', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🚤', '🛳️', '🛲', '🛐', '✈️', '🛩️', '🛫', '🛬'],
  objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️', '🗨️', '🗯️', '💭', '💤', '👋', '🤐', '🤫', '🤥', '🤬', '🤬', '😈', '🤓', '😎', '🤩', '🥳', '😏', '😒'],
};

const SYMBOLS_DATA = {
  math: ['±', '×', '÷', '=', '≠', '<', '>', '≤', '≥', '√', '∞', '∑', '∏', '∫', '∂', '∇', '∆', '∈', '∉', '∩', '∪', '⊂', '⊃', '⊆', '⊇'],
  arrows: ['←', '→', '↑', '↓', '↔', '↕', '↖', '↗', '↘', '↙', '⬅', '➡', '⬆', '⬇', '⬈', '⬉', '⬊', '⬋', '⤴', '⤵'],
  currency: ['$', '€', '£', '¥', '₹', '₽', '₩', '₪', '₦', '₨', '₱', '₡', '₲', '₵', '₴', '₸', '¢', '¤'],
  punctuation: ['!', '¡', '?', '¿', '.', ',', ':', ';', '«', '»', '"', "'", '„', '…', '‹', '›', '—', '–', '°', '′', '″'],
  brackets: ['(', ')', '[', ']', '{', '}', '⟨', '⟩', '«', '»', '‹', '›', '"', '"', "'", "'"],
  special: ['©', '®', '™', '℠', '€', '¢', '£', '¥', '§', '¶', '†', '‡', '•', '‰', '′', '″', '‴', '※', '‼', '⁈', '⁉', '⁏'],
};

function getBridgeHttpBase(): string {
  if (typeof window === 'undefined') return '';

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  const envUrl = (process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || '').trim();

  // Local dev can default to localhost.
  if (isLocal) return envUrl || 'http://localhost:3333';

  // Production must be explicit.
  return envUrl || '';
}

export default function WhatsAppChatDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [label, setLabel] = useState<string>('');

  const [chatBucket, setChatBucket] = useState<'all' | 'new' | 'old' | 'unread' | 'assigned' | 'unassigned' | 'labels'>(
    'all'
  );

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const [savedKind, setSavedKind] = useState<'templates' | 'quick_replies' | 'chatbots'>('quick_replies');
  const [savedId, setSavedId] = useState('');
  const [savedLoading, setSavedLoading] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplateRow[]>([]);
  const [chatbots, setChatbots] = useState<AutomationRuleRow[]>([]);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTitle, setQrTitle] = useState('');
  const [qrShortcut, setQrShortcut] = useState('');
  const [qrContent, setQrContent] = useState('');

  const [toolsTab, setToolsTab] = useState<'labels' | 'followups' | 'notes'>('labels');
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [followups, setFollowups] = useState<LeadFollowUp[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newFollowUpTitle, setNewFollowUpTitle] = useState('Follow up');
  const [newFollowUpDueAt, setNewFollowUpDueAt] = useState('');

  const [assignUserId, setAssignUserId] = useState('');
  const [nextStatus, setNextStatus] = useState('');

  // NEW: Preview, Spell Check, AI Support, Enhanced Schedule
  const [showPreview, setShowPreview] = useState(false);
  const [spellingErrors, setSpellingErrors] = useState<Array<{ word: string; index: number }>>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scheduleTemplate, setScheduleTemplate] = useState('');
  const [delayTemplate, setDelayTemplate] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // NEW: Emoji & Symbols
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<'smileys' | 'people' | 'nature' | 'food' | 'activity' | 'travel' | 'objects' | 'symbols'>('smileys');
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // NEW: WhatsApp Web QR Connection
  const [showQRModal, setShowQRModal] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [senderLabel, setSenderLabel] = useState<string>('');

  const bridgeHttpBase = useMemo(() => getBridgeHttpBase(), []);

  const [actionModal, setActionModal] = useState<null | 'assign' | 'broadcast' | 'status' | 'export' | 'schedule' | 'delay'>(null);
  const [broadcastLists, setBroadcastLists] = useState<Array<{ _id: string; name: string }>>([]);
  const [broadcastListId, setBroadcastListId] = useState('');
  const [broadcastNewName, setBroadcastNewName] = useState('');
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const [scheduleText, setScheduleText] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [delayMins, setDelayMins] = useState('5');
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Show the *actual* WhatsApp Web account that's connected (from the local bridge status).
  // This avoids confusing hardcoded defaults like +919309986820.
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      if (!bridgeHttpBase) {
        // Hosted bridge isn't configured for this environment.
        // Avoid fetching localhost from production domains.
        setSenderLabel('');
        setIsWhatsAppConnected(false);
        return;
      }
      try {
        const res = await fetch(`${bridgeHttpBase.replace(/\/$/, '')}/api/status`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;

        const acct = data.account;
        const phone = acct?.phone || acct?.wid || acct?.pushname;
        setSenderLabel(phone ? String(phone) : '');
        setIsWhatsAppConnected(Boolean(data.authenticated));
      } catch {
        if (!cancelled) {
          setSenderLabel('');
          // Keep existing state; bridge may not be running.
        }
      }
    };

    // Fetch once on load and then poll lightly.
    fetchStatus();
    const id = window.setInterval(fetchStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [bridgeHttpBase]);

  // Keep filters in a ref so the fetch callback stays stable (prevents UI vibration)
  const filtersRef = useRef({ q: '', status: '', label: '' });
  useEffect(() => {
    filtersRef.current = { q, status, label };
  }, [q, status, label]);

  // Reset label filter field unless user explicitly wants labels filtering
  useEffect(() => {
    if (chatBucket !== 'labels') setLabel('');
  }, [chatBucket]);

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (!opts?.silent) setLoadingConversations(true);
      const { q: qv, status: sv, label: lv } = filtersRef.current;
      const res = await crmFetch('/api/admin/crm/conversations', {
        params: {
          limit: 100,
          skip: 0,
          q: qv.trim() || undefined,
          status: sv || undefined,
          label: lv || undefined,
        },
      });
      setConversations(res?.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      if (!opts?.silent) setLoadingConversations(false);
    }
  }, [crmFetch]);

  const fetchQuickReplies = useCallback(async () => {
    try {
      const res = await crmFetch('/api/admin/crm/quick-replies', {
        params: { limit: 200, skip: 0, enabled: 'true' },
      });
      setQuickReplies(res?.replies || []);
    } catch {
      // Non-blocking
    }
  }, [crmFetch]);

  const fetchTemplates = useCallback(async () => {
    try {
      setSavedLoading(true);
      const res = await crmFetch('/api/admin/crm/templates', {
        params: { limit: 200, skip: 0 },
      });
      setTemplates(Array.isArray(res?.templates) ? res.templates : []);
    } catch {
      setTemplates([]);
    } finally {
      setSavedLoading(false);
    }
  }, [crmFetch]);

  const fetchChatbots = useCallback(async () => {
    try {
      setSavedLoading(true);
      const res = await crmFetch('/api/admin/crm/automations', {
        params: { limit: 200, skip: 0, enabled: 'true', triggerType: 'chatbot' },
      });
      setChatbots(Array.isArray(res?.rules) ? res.rules : []);
    } catch {
      setChatbots([]);
    } finally {
      setSavedLoading(false);
    }
  }, [crmFetch]);

  const fetchBroadcastLists = useCallback(async () => {
    try {
      const res = await crmFetch('/api/admin/crm/broadcast-lists', {
        params: { limit: 200, skip: 0 },
      });
      setBroadcastLists(Array.isArray(res?.lists) ? res.lists : []);
    } catch {
      setBroadcastLists([]);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (actionModal === 'broadcast') void fetchBroadcastLists();
  }, [actionModal, fetchBroadcastLists]);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = actionMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setActionMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [actionMenuOpen]);

  const createQuickReplyFromModal = useCallback(async () => {
    try {
      const title = qrTitle.trim();
      const content = qrContent.trim();
      const shortcut = qrShortcut.trim();
      if (!title) {
        setError('Quick reply title is required');
        return;
      }
      if (!content) {
        setError('Quick reply content is required');
        return;
      }
      setError(null);

      const created: any = await crmFetch('/api/admin/crm/quick-replies', {
        method: 'POST',
        body: { title, content, shortcut: shortcut || undefined, enabled: true },
      });

      setQrModalOpen(false);
      setQrTitle('');
      setQrShortcut('');
      setQrContent('');

      await fetchQuickReplies();
      setSavedKind('quick_replies');
      if (created?._id) setSavedId(String(created._id));
      setComposer(content);
      composerRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quick reply');
    }
  }, [crmFetch, fetchQuickReplies, qrContent, qrShortcut, qrTitle]);

  const fetchNotes = useCallback(
    async (leadId: string) => {
      const res = await crmFetch(`/api/admin/crm/leads/${leadId}/notes`, {
        params: { limit: 50, skip: 0 },
      });
      setNotes(res?.notes || []);
    },
    [crmFetch]
  );

  const fetchFollowUps = useCallback(
    async (leadId: string) => {
      const res = await crmFetch(`/api/admin/crm/leads/${leadId}/followups`, {
        params: { limit: 50, skip: 0, status: 'all' },
      });
      setFollowups(res?.followups || []);
    },
    [crmFetch]
  );

  const fetchThread = useCallback(
    async (leadId: string) => {
      try {
        setError(null);
        setLoadingMessages(true);

        // Mark thread as read (best-effort)
        await crmFetch('/api/admin/crm/messages', {
          method: 'PUT',
          body: { action: 'markThreadAsRead', leadId },
        }).catch(() => null);

        const res = await crmFetch('/api/admin/crm/messages', {
          params: {
            leadId,
            limit: 200,
            skip: 0,
            order: 'asc',
          },
        });
        setMessages(res?.messages || []);

        // Refresh conversations to update unread counts/last message
        fetchConversations({ silent: true });

        // Load right-panel tools
        setLoadingTools(true);
        await Promise.all([fetchNotes(leadId), fetchFollowUps(leadId)]);

        // Scroll to bottom
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoadingMessages(false);
        setLoadingTools(false);
      }
    },
    [crmFetch, fetchConversations, fetchFollowUps, fetchNotes]
  );

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchConversations();
    fetchQuickReplies();
  }, [token, router, fetchConversations, fetchQuickReplies]);

  // Lazy-load saved items depending on dropdown selection
  useEffect(() => {
    setSavedId('');
    if (savedKind === 'templates' && templates.length === 0 && !savedLoading) void fetchTemplates();
    if (savedKind === 'chatbots' && chatbots.length === 0 && !savedLoading) void fetchChatbots();
  }, [savedKind, templates.length, chatbots.length, fetchTemplates, fetchChatbots, savedLoading]);

  const selectedLeadName = selected?.name || selected?.leadNumber || 'Conversation';

  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const cutoffNewMs = 48 * 60 * 60 * 1000; // 48h
    const base = conversations;

    return base.filter((c) => {
      const lastAt = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0;
      const isNew = lastAt ? now - lastAt <= cutoffNewMs : true;
      const isOld = lastAt ? now - lastAt > cutoffNewMs : false;
      const isUnread = (c.unreadCount || 0) > 0;
      const isAssigned = Boolean(String(c.assignedToUserId || '').trim());
      const isUnassigned = !isAssigned;
      const hasLabel = (c.labels || []).some((l) => String(l).toLowerCase() === String(label).trim().toLowerCase());

      switch (chatBucket) {
        case 'new':
          return isNew;
        case 'old':
          return isOld;
        case 'unread':
          return isUnread;
        case 'assigned':
          return isAssigned;
        case 'unassigned':
          return isUnassigned;
        case 'labels':
          return label.trim() ? hasLabel : true;
        case 'all':
        default:
          return true;
      }
    });
  }, [conversations, chatBucket, label]);

  const groupedByDay = useMemo(() => {
    const groups: Array<{ day: string; items: Message[] }> = [];
    const keyFor = (m: Message) => formatDay(m.sentAt || m.createdAt) || '—';
    for (const m of messages) {
      const k = keyFor(m);
      const last = groups[groups.length - 1];
      if (!last || last.day !== k) groups.push({ day: k, items: [m] });
      else last.items.push(m);
    }
    return groups;
  }, [messages]);

  const handleSelect = useCallback(
    async (row: ConversationRow) => {
      setSelected(row);
      setShowQuickReplies(false);
      setToolsTab('labels');
      await fetchThread(row.leadId);
    },
    [fetchThread]
  );

  // Deep-link support: open WhatsApp dashboard directly from a Lead row.
  // Example: /admin/crm/whatsapp?leadId=<mongoId>&phone=<number>
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    const leadId = String(searchParams.get('leadId') || '').trim();
    const phone = String(searchParams.get('phone') || '').trim();
    if (!leadId && !phone) return;
    // Wait until conversations load at least once.
    if (!conversations.length && !leadId) return;

    const normalizePhone = (p: string) => String(p || '').replace(/\D+/g, '');
    const row = conversations.find((c) => {
      if (leadId && String(c.leadId) === leadId) return true;
      if (phone && normalizePhone(c.phoneNumber) === normalizePhone(phone)) return true;
      return false;
    });
    if (row) {
      didAutoSelectRef.current = true;
      void handleSelect(row);
      return;
    }

    // If no conversation exists yet (first outbound message), still allow opening the thread.
    if (!leadId) return;
    didAutoSelectRef.current = true;
    (async () => {
      try {
        const lead: any = await crmFetch(`/api/admin/crm/leads/${leadId}`, { method: 'GET' });
        if (!lead?._id || !lead?.phoneNumber) return;

        const syntheticRow: ConversationRow = {
          leadId: String(lead._id),
          leadNumber: lead.leadNumber ? String(lead.leadNumber) : undefined,
          name: lead.name ? String(lead.name) : undefined,
          phoneNumber: String(lead.phoneNumber),
          status: lead.status ? String(lead.status) : undefined,
          labels: Array.isArray(lead.labels) ? lead.labels.map((x: any) => String(x)) : undefined,
          assignedToUserId: lead.assignedToUserId ? String(lead.assignedToUserId) : undefined,
          lastDirection: undefined,
          lastMessageAt: undefined,
          lastMessageContent: undefined,
          lastStatus: undefined,
          unreadCount: 0,
        };
        await handleSelect(syntheticRow);
      } catch {
        // Non-blocking
      }
    })();
  }, [conversations, crmFetch, handleSelect, searchParams]);

  const handleSend = async () => {
    if (!selected) return;
    if (!token) {
      setError('Session expired. Please refresh the page or login again.');
      return;
    }
    const text = composer.trim();
    if (!text) return;

    try {
      setError(null);
      setSending(true);

      // Send via CRM endpoint (handles bridge + fallback queue)
      const res = await crmFetch('/api/admin/crm/whatsapp/send', {
        method: 'POST',
        body: {
          leadId: selected.leadId,
          phoneNumber: selected.phoneNumber,
          messageContent: text,
        },
      });

      if (res?.success || res?.data) {
        setComposer('');
        
        // Check if message is queued (bridge unavailable) or actually sent
        const messageStatus = res?.data?.status;
        const warning = res?.data?.warning;
        
        if (messageStatus === 'queued' && warning) {
          // Message was queued, show info instead of error
          setError(`✓ Message queued - ${warning}`);
        }
        
        // Refresh thread to show message
        await fetchThread(selected.leadId);
      } else {
        throw new Error(res?.error || 'Failed to send message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const upsertLabels = useCallback(
    async (nextLabels: string[]) => {
      if (!selected) return;
      const cleaned = Array.from(new Set(nextLabels.map((x) => String(x || '').trim()).filter(Boolean)));
      const res = await crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
        method: 'PUT',
        body: { labels: cleaned },
      });
      const updatedLabels: string[] = Array.isArray(res?.data?.labels) ? res.data.labels : cleaned;

      setSelected((prev) => (prev ? { ...prev, labels: updatedLabels } : prev));
      setConversations((prev) =>
        prev.map((c) => (c.leadId === selected.leadId ? { ...c, labels: updatedLabels } : c))
      );
    },
    [crmFetch, selected]
  );

  const updateLeadStatus = useCallback(
    async (next: string) => {
      if (!selected) return;
      const value = String(next || '').trim();
      const res = await crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
        method: 'PUT',
        body: { status: value },
      });
      const updatedStatus: string = String(res?.data?.status || value || '');
      setSelected((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
      setConversations((prev) => prev.map((c) => (c.leadId === selected.leadId ? { ...c, status: updatedStatus } : c)));
    },
    [crmFetch, selected]
  );

  const updateAssignedTo = useCallback(
    async (nextUserId: string | null) => {
      if (!selected) return;
      const res = await crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
        method: 'PUT',
        body: { assignedToUserId: nextUserId },
      });
      const updatedAssignedTo: string | undefined = res?.data?.assignedToUserId || (nextUserId || undefined);
      setSelected((prev) => (prev ? { ...prev, assignedToUserId: updatedAssignedTo } : prev));
      setConversations((prev) =>
        prev.map((c) => (c.leadId === selected.leadId ? { ...c, assignedToUserId: updatedAssignedTo } : c))
      );
    },
    [crmFetch, selected]
  );

  const exportChat = useCallback(() => {
    if (!selected) return;
    const payload = {
      leadId: selected.leadId,
      phoneNumber: selected.phoneNumber,
      name: selected.name,
      status: selected.status,
      labels: selected.labels || [],
      exportedAt: new Date().toISOString(),
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${selected.phoneNumber || selected.leadId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [messages, selected]);

  const addToBroadcastList = useCallback(async () => {
    if (!selected) return;
    try {
      setError(null);
      setBroadcastBusy(true);

      let listId = broadcastListId;
      const name = broadcastNewName.trim();
      if (name) {
        const created: any = await crmFetch('/api/admin/crm/broadcast-lists', {
          method: 'POST',
          body: { name },
        });
        if (created?._id) listId = String(created._id);
      }

      if (!listId) {
        setError('Please select a broadcast list or enter a new list name');
        return;
      }

      await crmFetch(`/api/admin/crm/broadcast-lists/${listId}/members`, {
        method: 'POST',
        body: { leadId: selected.leadId, phoneNumber: selected.phoneNumber },
      });

      setBroadcastListId('');
      setBroadcastNewName('');
      setActionModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to broadcast list');
    } finally {
      setBroadcastBusy(false);
    }
  }, [broadcastListId, broadcastNewName, crmFetch, selected]);

  const createScheduledMessage = useCallback(
    async (mode: 'schedule' | 'delay') => {
      if (!selected) return;
      const text = String(scheduleText || '').trim();
      if (!text) {
        setError('Message is required');
        return;
      }

      try {
        setError(null);
        setScheduleBusy(true);

        const body: any = {
          name: mode === 'schedule' ? 'Scheduled (single lead)' : 'Delayed (single lead)',
          messageType: 'text',
          messageContent: text,
          targetType: 'leadIds',
          targetLeadIds: [selected.leadId],
          timezone: 'Asia/Kolkata',
        };

        if (mode === 'schedule') {
          if (!scheduleAt) {
            setError('Please select date/time');
            return;
          }
          const d = new Date(scheduleAt);
          if (Number.isNaN(d.getTime())) {
            setError('Invalid date/time');
            return;
          }
          body.sendAt = d.toISOString();
        } else {
          const mins = Math.max(0, Number(delayMins || 0));
          if (!Number.isFinite(mins)) {
            setError('Invalid delay minutes');
            return;
          }
          body.delayMinutes = mins;
        }

        await crmFetch('/api/admin/crm/scheduled-messages', { method: 'POST', body });

        setActionModal(null);
        setScheduleAt('');
        setDelayMins('5');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to schedule message');
      } finally {
        setScheduleBusy(false);
      }
    },
    [crmFetch, delayMins, scheduleAt, scheduleText, selected]
  );

  const handleAIAssist = useCallback(async () => {
    if (!selected) return;
    try {
      setAiBusy(true);
      // Lightweight, deterministic “assist” (no external AI dependency)
      const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
      const name = selected.name || 'there';
      const suggestion = lastInbound?.messageContent
        ? `Hi ${name}, thanks for your message. I’m here to help.\n\nCan you share your preferred workshop (Online/Offline/Residential) and language (Hindi/English/Marathi)?`
        : `Hi ${name}! How can I help you today with Swar Yoga workshops?`;
      setComposer((prev) => (prev ? prev : suggestion));
    } finally {
      setAiBusy(false);
    }
  }, [messages, selected]);

  const addLabelToSelected = useCallback(async () => {
    if (!selected) {
      setError('No lead selected');
      return;
    }
    const l = newLabel.trim();
    if (!l) {
      setError('Label cannot be empty');
      return;
    }
    try {
      setError(null);
      const current = Array.isArray(selected.labels) ? selected.labels : [];
      // Check for duplicate
      if (current.some((x) => String(x).toLowerCase() === l.toLowerCase())) {
        setError('This label already exists');
        return;
      }
      await upsertLabels([...current, l]);
      setNewLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    }
  }, [selected, newLabel, upsertLabels]);

  const removeLabelFromSelected = useCallback(
    async (labelToRemove: string) => {
      if (!selected) {
        setError('No lead selected');
        return;
      }
      try {
        setError(null);
        const current = Array.isArray(selected.labels) ? selected.labels : [];
        await upsertLabels(current.filter((x) => x !== labelToRemove));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove label');
      }
    },
    [selected, upsertLabels]
  );

  // NEW: Handle composer text change with spell checking
  const handleComposerChange = (text: string) => {
    setComposer(text);
    const errors = checkSpelling(text);
    setSpellingErrors(errors);
  };

  // NEW: AI suggestions via Claude API
  const getAISuggestions = useCallback(async () => {
    if (!composer.trim()) return;
    try {
      setAiLoading(true);
      const response = await fetch('/api/admin/crm/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: composer }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
    } finally {
      setAiLoading(false);
    }
  }, [composer]);

  // NEW: Emoji & Symbols insertion
  const insertEmoji = (emoji: string) => {
    if (!composerRef.current) return;
    const textarea = composerRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = composer.substring(0, start) + emoji + composer.substring(end);
    setComposer(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
    setShowEmojiPicker(false);
  };

  const insertSymbol = (symbol: string) => {
    if (!composerRef.current) return;
    const textarea = composerRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = composer.substring(0, start) + symbol + composer.substring(end);
    setComposer(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const createNote = async () => {
    if (!selected) return;
    const note = newNote.trim();
    if (!note) return;
    setNewNote('');
    await crmFetch(`/api/admin/crm/leads/${selected.leadId}/notes`, {
      method: 'POST',
      body: { note, pinned: false },
    });
    await fetchNotes(selected.leadId);
  };

  const createFollowUp = async () => {
    if (!selected) return;
    if (!newFollowUpDueAt) {
      setError('Please select follow-up date/time');
      return;
    }
    const dueAt = new Date(newFollowUpDueAt);
    if (Number.isNaN(dueAt.getTime())) {
      setError('Invalid follow-up date/time');
      return;
    }
    await crmFetch(`/api/admin/crm/leads/${selected.leadId}/followups`, {
      method: 'POST',
      body: {
        title: newFollowUpTitle || 'Follow up',
        dueAt: dueAt.toISOString(),
        timezone: 'Asia/Kolkata',
      },
    });
    setNewFollowUpTitle('Follow up');
    setNewFollowUpDueAt('');
    await fetchFollowUps(selected.leadId);
  };

  return (
    <div className="whatsapp-crm">
      {/* LEFT SIDEBAR (CRM + WhatsApp) */}
      <aside className="crm-sidebar">
        <div className="logo">Swar Yoga CRM</div>

        <div style={{ margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: '#6B7280' }}>WhatsApp setup</div>
          {whatsappSetupLinks.map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: 13, opacity: 0.95 }}>
              {l.label}
            </Link>
          ))}
        </div>

        {[
          { href: '/admin/crm', label: 'Overview' },
          { href: '/admin/crm/leads', label: 'Leads' },
          { href: '/admin/crm/leads-followup', label: 'Leads Followup' },
          { href: '/admin/crm/sales', label: 'Sales' },
          { href: '/admin/crm/whatsapp', label: 'WhatsApp' },
          { href: '/admin/crm/analytics', label: 'Analytics' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={item.href === '/admin/crm/whatsapp' ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
        <Link href="/admin/crm/messages" style={{ marginTop: 10, display: 'block', opacity: 0.9 }}>
          Messages (table)
        </Link>
      </aside>

      {/* SECOND LEFT PANEL (Chats: New / Old / Labels) */}
      <aside className="chat-sidebar">
        <div className="chat-filters">
          <div className="chat-filter-tabs">
            <select
              aria-label="Chat list filter"
              className="chat-bucket-select"
              value={chatBucket}
              onChange={(e) => setChatBucket(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="old">Old</option>
              <option value="unread">Unread</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="labels">Labels</option>
            </select>
          </div>

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/phone" />

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </select>

          {chatBucket === 'labels' ? (
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          ) : null}

          <div className="chat-header-actions" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
            <button type="button" onClick={() => fetchConversations()}>
              Refresh
            </button>
          </div>
        </div>

        <div className="chat-list">
          {loadingConversations ? (
            <div style={{ padding: 16 }}>
              <LoadingSpinner />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 16, color: '#6B7280', fontSize: 13 }}>No chats found.</div>
          ) : (
            filteredConversations.map((c) => {
              const active = selected?.leadId === c.leadId;
              return (
                <button
                  key={c.leadId}
                  type="button"
                  className={`chat-item${active ? ' active' : ''}`}
                  onClick={() => handleSelect(c)}
                >
                  <div className="chat-item-top">
                    <div>
                      <div className="chat-name">{c.name || c.phoneNumber}</div>
                      <div className="chat-meta">{c.phoneNumber}</div>
                    </div>
                    {c.unreadCount ? <div className="chat-badge">{c.unreadCount}</div> : null}
                  </div>
                  <div className="chat-preview">{c.lastMessageContent || ''}</div>
                  <div className="chat-meta">
                    {c.lastMessageAt ? `${formatDay(c.lastMessageAt)} • ${formatTime(c.lastMessageAt)}` : ''}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* CENTER MAIN CHAT (White, WhatsApp-like) */}
      <main className="chat-main">
        {/* Header Menu Bar (to save sidebar space) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 12px',
            borderBottom: '1px solid #E5E7EB',
            background: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>WhatsApp Inbox</div>

            {/* Always show connected sender if connected */}
            {isWhatsAppConnected ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#065F46',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '4px 8px',
                  borderRadius: 999,
                  maxWidth: 520,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={senderLabel ? `Connected: ${senderLabel}` : 'WhatsApp connected'}
              >
                <span aria-hidden="true">🟢</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Connected{senderLabel ? `: ${senderLabel}` : ''}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#6B7280',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                <span aria-hidden="true">⚪</span>
                <span>Not connected</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href="/admin/crm/chatbots"
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
              }}
            >
              🤖 Chatbot
            </Link>
            <Link
              href="/admin/crm/automation"
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
              }}
            >
              ⚡ Automation
            </Link>
            <Link
              href="/admin/crm/whatsapp/settings"
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
              }}
            >
              ⚙️ Settings
            </Link>
            <Link
              href="/admin/crm/whatsapp/templates"
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
              }}
            >
              🧾 Template
            </Link>

            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#111827',
                color: '#fff',
              }}
              title="Connect WhatsApp Web"
            >
              🔗 Connect
            </button>
          </div>
        </div>

        <div className="chat-header">
          <div>
            <div>{selectedLeadName}</div>
            <div className="sub">{selected?.phoneNumber || 'Select a chat to start'}</div>
            <div className="chip-row">
              {selected?.status ? <span className="chip status">Status: {selected.status}</span> : null}
              {Array.isArray(selected?.labels) && selected.labels.length ? (
                selected.labels.slice(0, 6).map((l) => (
                  <span key={l} className="chip">
                    {l}
                  </span>
                ))
              ) : selected ? (
                <span className="chip">No labels</span>
              ) : null}
            </div>
            {/* Sender WhatsApp Account Display (keep it visible for selected chat too) */}
            {selected && isWhatsAppConnected ? (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#065F46', fontStyle: 'italic' }}>
                📱 Sender connected{senderLabel ? `: ${senderLabel}` : ''}
              </div>
            ) : selected ? (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                📱 Sender: Not connected
              </div>
            ) : null}
            {error ? (
              <div style={{ marginTop: 10 }}>
                <AlertBox type="error" message={error} />
              </div>
            ) : null}
          </div>

          <div className="chat-header-actions">
            {/* Connect/Refresh WhatsApp Button */}
            <button
              type="button"
              title="Connect/Refresh WhatsApp"
              onClick={() => setShowQRModal(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
              }}
            >
              🔄
            </button>
          </div>
        </div>

        <div className="chat-actionbar">
          {/* NEW: WhatsApp Web QR Button */}
          <button
            type="button"
            className="action-icon"
            onClick={() => setShowQRModal(true)}
            style={{ position: 'relative' }}
            aria-label="Connect WhatsApp Web"
            title="Connect personal WhatsApp (WhatsApp Web)"
          >
            {isWhatsAppConnected && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '10px',
                  height: '10px',
                  background: '#10b981',
                  borderRadius: '50%',
                }}
              ></span>
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.98C9.23 22.5 10.6 23 12 23c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.41 0-2.73-.36-3.88-.98l-.28-.15-2.89.45.45-2.89-.15-.28C4.36 14.73 4 13.41 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            type="button"
            className="action-icon"
            onClick={() => setActionModal('assign')}
            disabled={!selected}
            aria-label="Assign user"
            title="Assign user"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            type="button"
            className="action-icon"
            onClick={() => setActionModal('broadcast')}
            disabled={!selected}
            aria-label="Add to broadcast"
            title="Add to broadcast"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M3 11v2h2l6 6v-4l7-1a3 3 0 0 0 0-6l-7-1V5l-6 6H3Zm16.5 1a1.5 1.5 0 0 1-1.2 1.47L11 14.1V9.9l7.3.63A1.5 1.5 0 0 1 19.5 12Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            type="button"
            className="action-icon"
            onClick={() => setActionModal('status')}
            disabled={!selected}
            aria-label="Change status"
            title="Change status"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H12l-5 5v-5H7a4 4 0 0 1-4-4V7Zm6.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            type="button"
            className="action-icon"
            onClick={() => setActionModal('export')}
            disabled={!selected}
            aria-label="Export chat"
            title="Export chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="chat-actionbar-spacer" />

          <Link className="action-icon link" href="/admin/crm/whatsapp/templates" aria-label="Manage templates" title="Manage templates">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M3 3h18v2H3V3Zm0 8h18v2H3v-2Zm0 8h18v2H3v-2Z"
                fill="currentColor"
              />
            </svg>
          </Link>

          <Link className="action-icon link" href="/admin/crm/chatbots" aria-label="Open chatbots" title="Open chatbots">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M12 2a6 6 0 0 0-6 6v1H5a2 2 0 0 0-2 2v6a3 3 0 0 0 3 3h2v2h2v-2h4v2h2v-2h2a3 3 0 0 0 3-3v-6a2 2 0 0 0-2-2h-1V8a6 6 0 0 0-6-6Zm-4 7V8a4 4 0 0 1 8 0v1H8Zm2 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6-1.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z"
                fill="currentColor"
              />
            </svg>
          </Link>

          <Link className="action-icon link" href="/admin/crm/whatsapp/settings" aria-label="WhatsApp settings" title="WhatsApp settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l1.72-1.34c.15-.12.19-.34.1-.51l-1.63-2.83c-.12-.22-.37-.29-.59-.22l-2.03.81c-.42-.32-.9-.6-1.44-.79l-.3-2.16c-.04-.24-.24-.41-.48-.41h-3.28c-.25 0-.45.17-.49.41l-.3 2.16c-.54.18-1.02.47-1.44.79l-2.03-.81c-.22-.09-.47 0-.59.22L2.74 8.87c-.1.16-.06.39.1.51l1.72 1.34c-.05.3-.07.62-.07.94s.02.64.07.94l-1.72 1.34c-.15.12-.19.34-.1.51l1.63 2.83c.12.22.37.29.59.22l2.03-.81c.42.32.9.6 1.44.79l.3 2.16c.05.24.24.41.49.41h3.28c.25 0 .45-.17.49-.41l.3-2.16c.54-.18 1.02-.47 1.44-.79l2.03.81c.22.09.47 0 .59-.22l1.63-2.83c.1-.16.06-.39-.1-.51l-1.72-1.34ZM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z"
                fill="currentColor"
              />
            </svg>
          </Link>

          <div ref={actionMenuRef} className="action-dropdown">
            <button
              type="button"
              className="action-icon"
              onClick={() => setActionMenuOpen((v) => !v)}
              disabled={!selected}
              aria-label="More actions"
              title="More actions"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {actionMenuOpen ? (
              <div className="popover action-menu" role="menu" aria-label="More actions menu">
                <div className="hint">Quick actions</div>

                <button
                  type="button"
                  className="item"
                  onClick={() => {
                    setActionMenuOpen(false);
                    void handleAIAssist();
                  }}
                >
                  <span className="icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 2l1.2 5.1L18 8.3l-4.3 2.7 1.3 5-3-3.3-3 3.3 1.3-5L6 8.3l4.8-1.2L12 2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <div>
                    <div className="title">AI assist</div>
                    <div className="body">Suggest a reply in composer</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="item"
                  onClick={() => {
                    setActionMenuOpen(false);
                    setScheduleText((composer || '').trim() || '');
                    setScheduleAt('');
                    setActionModal('schedule');
                  }}
                >
                  <span className="icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v3H2V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm15 10v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7h20Zm-6 2h-6v2h6v-2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <div>
                    <div className="title">Schedule message</div>
                    <div className="body">Send at a specific date/time</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="item"
                  onClick={() => {
                    setActionMenuOpen(false);
                    setScheduleText((composer || '').trim() || '');
                    setDelayMins('5');
                    setActionModal('delay');
                  }}
                >
                  <span className="icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.25l4 2.37-1 1.64L11 13V7h2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <div>
                    <div className="title">Delay message</div>
                    <div className="body">Send after N minutes</div>
                  </div>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div ref={listRef} className="chat-messages">
          {!selected ? (
            <div style={{ color: '#6B7280', fontSize: 13 }}>Select a conversation from the left.</div>
          ) : loadingMessages ? (
            <LoadingSpinner />
          ) : groupedByDay.length === 0 ? (
            <div style={{ color: '#6B7280', fontSize: 13 }}>No messages yet.</div>
          ) : (
            groupedByDay.map((g) => (
              <div key={g.day}>
                <div className="day-divider">
                  <span>{g.day}</span>
                </div>
                {g.items.map((m) => {
                  const inbound = m.direction === 'inbound';
                  return (
                    <div key={m._id} className={`msg ${inbound ? 'in' : 'out'}`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.messageContent}</div>
                      <div className="msg-meta">
                        <span>{formatTime(m.sentAt || m.createdAt)}</span>
                        {!inbound ? <span>{m.status}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* MESSAGE COMPOSER (Like WATI) */}
        <div className="saved-picker">
          <div className="saved-picker-row">
            <select
              aria-label="Saved items type"
              value={savedKind}
              onChange={(e) => setSavedKind(e.target.value as any)}
            >
              <option value="templates">Templates</option>
              <option value="quick_replies">Quick replies</option>
              <option value="chatbots">Chatbots</option>
            </select>

            <select
              aria-label="Saved item"
              value={savedId}
              onChange={(e) => {
                const id = e.target.value;
                setSavedId(id);
                if (!id) return;

                if (savedKind === 'quick_replies') {
                  const item = quickReplies.find((r) => r._id === id);
                  if (item?.content) {
                    setComposer(item.content);
                    composerRef.current?.focus();
                  }
                  return;
                }

                if (savedKind === 'templates') {
                  const t = templates.find((x) => x._id === id);
                  if (t?.templateContent) {
                    setComposer(t.templateContent);
                    composerRef.current?.focus();
                  }
                  return;
                }

                if (savedKind === 'chatbots') {
                  const r = chatbots.find((x) => x._id === id);
                  if (String(r?.actionType || '') === 'send_text' && r?.actionText) {
                    setComposer(r.actionText);
                    composerRef.current?.focus();
                  } else {
                    setError('This chatbot rule is not a simple text reply. Please open Chatbots to manage it.');
                  }
                }
              }}
              disabled={savedLoading}
            >
              <option value="">
                {savedLoading
                  ? 'Loading…'
                  : savedKind === 'templates'
                    ? templates.length
                      ? 'Select template'
                      : 'No templates'
                    : savedKind === 'quick_replies'
                      ? quickReplies.length
                        ? 'Select quick reply'
                        : 'No quick replies'
                      : chatbots.length
                        ? 'Select chatbot'
                        : 'No chatbots'}
              </option>

              {savedKind === 'quick_replies'
                ? quickReplies.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}{r.shortcut ? ` (${r.shortcut})` : ''}
                    </option>
                  ))
                : null}

              {savedKind === 'templates'
                ? templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.templateName}
                      {t.category ? ` • ${t.category}` : ''}
                      {t.status ? ` • ${t.status}` : ''}
                    </option>
                  ))
                : null}

              {savedKind === 'chatbots'
                ? chatbots.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))
                : null}
            </select>

            <button
              type="button"
              className="saved-icon-btn"
              aria-label={
                savedKind === 'quick_replies'
                  ? 'Add quick reply'
                  : savedKind === 'templates'
                    ? 'Manage templates'
                    : 'Manage chatbots'
              }
              title={
                savedKind === 'quick_replies'
                  ? 'Add quick reply'
                  : savedKind === 'templates'
                    ? 'Manage templates'
                    : 'Manage chatbots'
              }
              onClick={() => {
                if (savedKind === 'quick_replies') {
                  setQrModalOpen(true);
                  return;
                }
                if (savedKind === 'templates') {
                  router.push('/admin/crm/templates');
                  return;
                }
                router.push('/admin/crm/chatbots');
              }}
            >
              +
            </button>
          </div>
        </div>

        {actionModal ? (
          <div className="saved-modal-backdrop" role="dialog" aria-modal="true">
            <div className="saved-modal">
              <div className="saved-modal-title">
                {actionModal === 'assign'
                  ? 'Assign user'
                  : actionModal === 'broadcast'
                    ? 'Add to broadcast'
                    : actionModal === 'status'
                      ? 'Change status'
                      : actionModal === 'export'
                        ? 'Export chat'
                        : actionModal === 'schedule'
                          ? 'Schedule message'
                          : 'Delay message'}
              </div>
              <div className="saved-modal-body">
                {actionModal === 'assign' ? (
                  <>
                    <div style={{ color: '#6B7280', fontSize: 12 }}>
                      Current: {String(selected?.assignedToUserId || 'Unassigned')}
                    </div>
                    <label>
                      UserId
                      <input
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        placeholder="e.g. admincrm"
                      />
                    </label>
                  </>
                ) : null}

                {actionModal === 'broadcast' ? (
                  <>
                    <label>
                      Select list
                      <select value={broadcastListId} onChange={(e) => setBroadcastListId(e.target.value)}>
                        <option value="">Select broadcast list…</option>
                        {broadcastLists.map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Or create new list
                      <input
                        value={broadcastNewName}
                        onChange={(e) => setBroadcastNewName(e.target.value)}
                        placeholder="e.g. December leads"
                      />
                    </label>
                    <div style={{ color: '#6B7280', fontSize: 12 }}>
                      Will add: {selected?.name || selected?.phoneNumber} ({selected?.phoneNumber})
                    </div>
                  </>
                ) : null}

                {actionModal === 'status' ? (
                  <label>
                    Status
                    <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                      <option value="">Select status…</option>
                      <option value="lead">Lead</option>
                      <option value="prospect">Prospect</option>
                      <option value="customer">Customer</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                ) : null}

                {actionModal === 'export' ? (
                  <div style={{ color: '#6B7280', fontSize: 12 }}>
                    Download this chat as JSON (includes messages).
                  </div>
                ) : null}

                {actionModal === 'schedule' ? (
                  <>
                    <label>
                      Message
                      <textarea
                        rows={4}
                        value={scheduleText}
                        onChange={(e) => setScheduleText(e.target.value)}
                        placeholder="Message to schedule…"
                      />
                    </label>
                    <label>
                      Or use template
                      <select
                        value={scheduleTemplate}
                        onChange={(e) => {
                          const id = e.target.value;
                          setScheduleTemplate(id);
                          if (id) {
                            const t = templates.find((x) => x._id === id);
                            if (t?.templateContent) {
                              setScheduleText(t.templateContent);
                            }
                          }
                        }}
                      >
                        <option value="">Select template…</option>
                        {templates.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.templateName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Send at
                      <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                    </label>
                  </>
                ) : null}

                {actionModal === 'delay' ? (
                  <>
                    <label>
                      Message
                      <textarea
                        rows={4}
                        value={scheduleText}
                        onChange={(e) => setScheduleText(e.target.value)}
                        placeholder="Message to delay…"
                      />
                    </label>
                    <label>
                      Or use template
                      <select
                        value={delayTemplate}
                        onChange={(e) => {
                          const id = e.target.value;
                          setDelayTemplate(id);
                          if (id) {
                            const t = templates.find((x) => x._id === id);
                            if (t?.templateContent) {
                              setScheduleText(t.templateContent);
                            }
                          }
                        }}
                      >
                        <option value="">Select template…</option>
                        {templates.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.templateName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Delay (minutes)
                      <input value={delayMins} onChange={(e) => setDelayMins(e.target.value)} placeholder="e.g. 5" />
                    </label>
                  </>
                ) : null}
              </div>
              <div className="saved-modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setActionModal(null);
                    setBroadcastBusy(false);
                  }}
                >
                  Close
                </button>

                {actionModal === 'assign' ? (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        await updateAssignedTo(null);
                        setAssignUserId('');
                        setActionModal(null);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M7 11h10v2H7v-2Z" fill="currentColor" />
                        </svg>
                        Unassign
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const v = assignUserId.trim();
                        if (!v) return;
                        await updateAssignedTo(v);
                        setAssignUserId('');
                        setActionModal(null);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path
                            d="M9.2 16.6 5.6 13l1.4-1.4 2.2 2.2 7-7L17.6 8l-8.4 8.6Z"
                            fill="currentColor"
                          />
                        </svg>
                        Assign
                      </span>
                    </button>
                  </>
                ) : null}

                {actionModal === 'broadcast' ? (
                  <button type="button" onClick={addToBroadcastList} disabled={broadcastBusy}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M11 5h2v14h-2V5Zm-6 6h14v2H5v-2Z" fill="currentColor" />
                      </svg>
                      {broadcastBusy ? 'Adding…' : 'Add'}
                    </span>
                  </button>
                ) : null}

                {actionModal === 'status' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!nextStatus) return;
                      await updateLeadStatus(nextStatus);
                      setNextStatus('');
                      setActionModal(null);
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                          d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.8 1h-2.1A7 7 0 0 0 19 13c0-3.87-3.13-7-7-7Z"
                          fill="currentColor"
                        />
                      </svg>
                      Update
                    </span>
                  </button>
                ) : null}

                {actionModal === 'export' ? (
                  <button
                    type="button"
                    onClick={() => {
                      exportChat();
                      setActionModal(null);
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                          d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z"
                          fill="currentColor"
                        />
                      </svg>
                      Download
                    </span>
                  </button>
                ) : null}

                {actionModal === 'schedule' ? (
                  <button type="button" onClick={() => void createScheduledMessage('schedule')} disabled={scheduleBusy}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                          d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v3H2V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm15 10v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7h20Z"
                          fill="currentColor"
                        />
                      </svg>
                      {scheduleBusy ? 'Scheduling…' : 'Schedule'}
                    </span>
                  </button>
                ) : null}

                {actionModal === 'delay' ? (
                  <button type="button" onClick={() => void createScheduledMessage('delay')} disabled={scheduleBusy}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.25l4 2.37-1 1.64L11 13V7h2Z"
                          fill="currentColor"
                        />
                      </svg>
                      {scheduleBusy ? 'Delaying…' : 'Delay'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {qrModalOpen ? (
          <div className="saved-modal-backdrop" role="dialog" aria-modal="true">
            <div className="saved-modal">
              <div className="saved-modal-title">Add Quick Reply</div>
              <div className="saved-modal-body">
                <label>
                  Title
                  <input id="qr-title" name="qr-title" value={qrTitle} onChange={(e) => setQrTitle(e.target.value)} placeholder="Eg: Pricing" />
                </label>
                <label>
                  Shortcut (optional)
                  <input id="qr-shortcut" name="qr-shortcut" value={qrShortcut} onChange={(e) => setQrShortcut(e.target.value)} placeholder="Eg: /pricing" />
                </label>
                <label>
                  Message
                  <textarea id="qr-content" name="qr-content" value={qrContent} onChange={(e) => setQrContent(e.target.value)} rows={4} placeholder="Write the reply…" />
                </label>
              </div>
              <div className="saved-modal-actions">
                <button type="button" className="secondary" onClick={() => setQrModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" onClick={createQuickReplyFromModal}>
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="chat-composer">
          <div style={{ position: 'relative', width: '100%' }}>
            <textarea
              id="message-composer"
              name="message-composer"
              ref={composerRef}
              value={composer}
              onChange={(e) => handleComposerChange(e.target.value)}
              placeholder={selected ? 'Type a message…' : 'Select a conversation to start'}
              disabled={!selected || sending}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ 
                paddingRight: '60px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            
            {/* NEW: Preview Button + Spell Check Indicator + Emoji */}
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              display: 'flex', 
              gap: '8px',
              alignItems: 'center'
            }}>
              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={!selected}
                title="Add emoji or symbols"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  opacity: 0.6,
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              >
                😊
              </button>

              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!composer.trim()}
                title="Preview message (Ctrl+P)"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  opacity: 0.6,
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              >
                👁️
              </button>
              {spellingErrors.length > 0 && (
                <div
                  title={`${spellingErrors.length} spelling error${spellingErrors.length > 1 ? 's' : ''}`}
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚠️ {spellingErrors.length}
                </div>
              )}
            </div>
          </div>

          {/* NEW: AI Suggestions Panel */}
          {aiSuggestions.length > 0 && (
            <div style={{ 
              marginTop: '4px', 
              padding: '8px 10px', 
              background: '#e8f5e9', 
              borderRadius: '8px',
              border: '1px solid #c8e6c9'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                marginBottom: '6px',
                color: '#2e7d32'
              }}>
                ✨ AI Suggestions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aiSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setComposer(sug)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid #c8e6c9',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#1b5e20',
                      transition: 'all 0.2s',
                      hyphens: 'auto',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f8e9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    {sug.substring(0, 120)}{sug.length > 120 ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              className="send-btn"
              onClick={handleSend}
              disabled={!selected || sending || !composer.trim()}
              aria-label="Send message (Enter)"
              title="Send message (Shift+Enter for new line)"
            >
              {sending ? (
                '⏳ Sending…'
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.4 20.2L21 12 3.4 3.8 3 10l11 2-11 2 .4 6.2Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>

            {/* NEW: AI Get Suggestions Button */}
            <button
              type="button"
              onClick={getAISuggestions}
              disabled={aiLoading || !composer.trim()}
              title="Get AI suggestions (Ctrl+K)"
              style={{
                padding: '10px 12px',
                background: '#f0f0f0',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '90px',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = '#e8e8e8';
                }
              }}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f0f0f0')}
            >
              {aiLoading ? (
                <>⏳ Loading...</>
              ) : (
                <>✨ AI</>
              )}
            </button>
          </div>
        </div>

        {/* NEW: Message Preview Modal */}
        {showPreview && (
          <div className="saved-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowPreview(false)}>
            <div className="saved-modal" onClick={(e) => e.stopPropagation()}>
              <div className="saved-modal-title">📱 WhatsApp Preview</div>
              <div className="saved-modal-body">
                <div
                  style={{
                    background: '#0b141a',
                    color: '#e1e8ed',
                    padding: '16px',
                    borderRadius: '8px',
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    maxWidth: '400px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                  {composer}
                </div>
                {spellingErrors.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '8px', background: '#fff3cd', borderRadius: '4px' }}>
                    <strong>Spelling errors found:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {spellingErrors.map((err, idx) => (
                        <li key={idx} style={{ fontSize: '12px' }}>
                          "{err.word}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="saved-modal-actions">
                <button type="button" className="secondary" onClick={() => setShowPreview(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Emoji & Symbols Picker Modal */}
        {showEmojiPicker && (
          <div className="saved-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowEmojiPicker(false)}>
            <div className="saved-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="saved-modal-title">😊 Emoji & Symbols</div>
              <div className="saved-modal-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {/* Emoji Categories */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '8px' }}>
                    📦 Emoji Categories:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {(['smileys', 'people', 'nature', 'food', 'activity', 'travel', 'objects', 'symbols'] as const).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEmojiCategory(cat)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #E5E7EB',
                            background: emojiCategory === cat ? '#1E7F43' : '#f3f4f6',
                            color: emojiCategory === cat ? '#fff' : '#1f2937',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      )
                    )}
                  </div>

                  {/* Emoji Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
                    {EMOJI_COLLECTIONS[emojiCategory].map((emoji, idx) => (
                      <button
                        key={`${emojiCategory}-${idx}`}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        title={`Insert ${emoji}`}
                        style={{
                          fontSize: '24px',
                          background: '#f3f4f6',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbols Categories */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                    ⚡ Symbols & Special Characters:
                  </div>

                  {Object.entries(SYMBOLS_DATA).map(([catName, symbols]) => (
                    <div key={catName} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' }}>
                        {catName.toUpperCase()}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '6px' }}>
                        {symbols.map((sym, idx) => (
                          <button
                            key={`${catName}-${idx}`}
                            type="button"
                            onClick={() => insertSymbol(sym)}
                            title={`Insert ${sym}`}
                            style={{
                              fontSize: '16px',
                              background: '#f3f4f6',
                              border: '1px solid #E5E7EB',
                              borderRadius: '4px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '600',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="saved-modal-actions">
                <button type="button" className="secondary" onClick={() => setShowEmojiPicker(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT SIDEBAR (All actions & tools) */}
      <aside className="tools-sidebar">
        <h3>Tools</h3>

        {!selected ? (
          <div style={{ color: '#6B7280', fontSize: 13 }}>Select a conversation to use tools.</div>
        ) : loadingTools ? (
          <LoadingSpinner />
        ) : (
          <>
            <details className="tools-section" open>
              <summary>
                Follow-ups <span style={{ color: '#6B7280', fontSize: 12 }}>{followups.length}</span>
              </summary>
              <div className="content">
                <div className="tools-row">
                  <input value={newFollowUpTitle} onChange={(e) => setNewFollowUpTitle(e.target.value)} />
                </div>
                <div className="tools-row">
                  <input type="datetime-local" value={newFollowUpDueAt} onChange={(e) => setNewFollowUpDueAt(e.target.value)} />
                </div>
                <div className="tools-row">
                  <button type="button" onClick={createFollowUp} style={{ width: '100%' }}>
                    Create follow-up
                  </button>
                </div>

                {followups.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {followups.map((f) => (
                      <div key={f._id} style={{ padding: 12, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1F2937', fontSize: 13 }}>{f.title || 'Follow up'}</div>
                            <div style={{ color: '#6B7280', fontSize: 12 }}>
                              Due: {formatDay(f.dueAt)} • {formatTime(f.dueAt)}
                            </div>
                          </div>
                          <span className="chip">{String(f.status || 'open')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6B7280', fontSize: 12 }}>No follow-ups.</div>
                )}
              </div>
            </details>

            <details className="tools-section">
              <summary>
                Notes <span style={{ color: '#6B7280', fontSize: 12 }}>{notes.length}</span>
              </summary>
              <div className="content">
                <div className="tools-row">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createNote();
                      }
                    }}
                  />
                  <button type="button" onClick={createNote} style={{ background: '#1F7A5B' }}>
                    Save
                  </button>
                </div>
                {notes.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {notes.map((n) => (
                      <div key={n._id} style={{ padding: 12, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff' }}>
                        <div style={{ color: '#1F2937', fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.note}</div>
                        <div style={{ marginTop: 6, color: '#6B7280', fontSize: 12 }}>
                          {formatDay(n.createdAt)} • {formatTime(n.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6B7280', fontSize: 12 }}>No notes.</div>
                )}
              </div>
            </details>

            <details className="tools-section" open>
              <summary>
                Tags / Labels <span style={{ color: '#6B7280', fontSize: 12 }}>{(selected?.labels || []).length}</span>
              </summary>
              <div className="content">
                <div className="tools-row" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Add label"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addLabelToSelected();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => void addLabelToSelected()}
                    style={{
                      background: '#1E7F43',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '12px' }}>
                  {(selected?.labels || []).length ? (
                    (selected?.labels || []).map((l) => (
                      <button 
                        key={l} 
                        type="button" 
                        onClick={() => void removeLabelFromSelected(String(l))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FECACA';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FEE2E2';
                        }}
                      >
                        {l} <span style={{ fontWeight: 'bold', fontSize: '14px' }}>×</span>
                      </button>
                    ))
                  ) : (
                    <div style={{ color: '#6B7280', fontSize: 12 }}>No labels yet.</div>
                  )}
                </div>
              </div>
            </details>

            <details className="tools-section">
              <summary>Consent Status</summary>
              <div className="content">
                <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>
                  Consent tracking is managed in Settings.
                </div>
                <div className="tools-row">
                  <Link href="/admin/crm/permissions" style={{ textDecoration: 'underline', color: '#1F7A5B' }}>
                    Open Consent Settings
                  </Link>
                </div>
              </div>
            </details>

            {/* Remaining WATI-level tools — placeholders, but properly organized */}
            {[
              'To-Do',
              'AI Suggestions',
              'Conversation History',
            ].map((title) => (
              <details key={title} className="tools-section">
                <summary>{title}</summary>
                <div className="content">
                  <div style={{ color: '#6B7280', fontSize: 12 }}>Coming soon (UI section is ready).</div>
                </div>
              </details>
            ))}
          </>
        )}
      </aside>

      {/* NEW: WhatsApp Web QR Modal */}
      <QRConnectionModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onConnected={() => setIsWhatsAppConnected(true)}
      />
    </div>
  );
}
