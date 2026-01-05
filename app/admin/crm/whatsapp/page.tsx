'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';
import { QRConnectionModal } from '@/components/admin/crm/QRConnectionModal';
import CreateLeadModal from '@/components/admin/crm/CreateLeadModal';
import { whatsappSetupLinks } from './page-links';

function decodeJwtPayloadSafe(token: string): Record<string, any> | null {
  // Client-only helper: decode payload WITHOUT verifying signature.
  // We only use it to read display fields (userId/email) from the admin token.
  // Do not use for authorization decisions.
  try {
    const t = String(token || '').trim();
    if (!t) return null;
    const parts = t.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);

    // atob is available in browsers; this file is a client component.
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type ConversationRow = {
  leadId: string;
  leadNumber?: string;
  name?: string;
  phoneNumberNormalized?: string;
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

function getInitials(label?: string) {
  const s = String(label || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || '';
  return (first + second).toUpperCase();
}

function normalizePhoneDigits(input?: string): string {
  return String(input || '').replace(/\D+/g, '');
}

function formatPhoneForDisplay(input?: string): string {
  const digits = normalizePhoneDigits(input);
  if (!digits) return '';

  // Simple formatting for common cases (kept intentionally conservative)
  if (digits.length === 12 && digits.startsWith('91')) {
    // India: 91 + 10 digits
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return digits;
  }
  return `+${digits}`;
}

function resolveLeadLabel(row?: ConversationRow | null): string {
  if (!row) return 'Conversation';
  const name = String(row.name || '').trim();
  if (name) return name;

  const leadNumber = String(row.leadNumber || '').trim();
  if (leadNumber) return leadNumber;

  // Fall back to a nicely formatted phone number
  return formatPhoneForDisplay(row.phoneNumber) || row.phoneNumber || 'Conversation';
}

type PopulatedLead = { _id: string; name?: string; phoneNumber?: string };

type AdminUserRow = {
  _id: string;
  userId?: string;
  email?: string;
};

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
  buttons?: Array<{ title?: string }>;
  headerMedia?: {
    kind?: 'image' | 'video';
    url?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  };
};

type SelectedTemplate = {
  id: string;
  name: string;
  body: string;
  buttons: Array<{ title?: string }>;
  headerMedia?: {
    kind?: 'image' | 'video';
    url?: string;
  };
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

// Helper to calculate followup status
function getFollowUpStatus(dueAt: string, currentStatus?: string): string {
  if (currentStatus === 'done') return 'done';
  const now = new Date();
  const due = new Date(dueAt);
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOverdue >= 5) return 'overdue';
  return currentStatus || 'pending';
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

function MessageStatusTicks({ status }: { status: Message['status'] }) {
  // WhatsApp-like ticks:
  // - queued/sent -> single tick
  // - delivered -> double tick
  // - read -> double tick (blue)
  // - failed -> red exclamation
  if (status === 'failed') {
    return (
      <span className="wa-status wa-status--failed" title="Failed">
        !
      </span>
    );
  }

  const double = status === 'delivered' || status === 'read';
  const cls = status === 'read' ? 'wa-status wa-status--read' : 'wa-status';

  return (
    <span className={cls} title={status}>
      <span className="wa-tick">✓</span>
      {double ? <span className="wa-tick wa-tick--second">✓</span> : null}
    </span>
  );
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
  // Don't assume a local bridge is running. If the env var isn't set,
  // we return empty so the UI doesn't spam ERR_CONNECTION_REFUSED.
  if (isLocal) return envUrl || '';

  // Production must be explicit.
  return envUrl || '';
}

export default function WhatsAppChatDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();

  const viewer = useMemo(() => {
    const t = String(token || '').trim();
    if (!t) return { userId: '', email: '' };
    const decoded = decodeJwtPayloadSafe(t);
    return {
      userId: String(decoded?.userId || '').trim(),
      email: String(decoded?.email || '').trim(),
    };
  }, [token]);
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  // UI: resizable sidebar (chat list)
  const CHAT_SIDEBAR_MIN = 280;
  const CHAT_SIDEBAR_MAX = 520;
  const CHAT_SIDEBAR_STORAGE_KEY = 'wa_chat_sidebar_width_v1';
  const [chatSidebarWidth, setChatSidebarWidth] = useState<number>(360);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(360);

  // UI: resizable right tools sidebar
  const TOOLS_SIDEBAR_MIN = 280;
  const TOOLS_SIDEBAR_MAX = 640;
  const TOOLS_SIDEBAR_STORAGE_KEY = 'wa_tools_sidebar_width_v1';
  const [toolsSidebarWidth, setToolsSidebarWidth] = useState<number>(360);
  const toolsResizingRef = useRef(false);
  const toolsStartXRef = useRef(0);
  const toolsStartWRef = useRef(360);

  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const [waDiagnostics, setWaDiagnostics] = useState<any>(null);
  const [waDiagnosticsLoading, setWaDiagnosticsLoading] = useState(false);
  const [waDiagnosticsError, setWaDiagnosticsError] = useState<string | null>(null);

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
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
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

  // Admin + display names
  const ADMIN_DISPLAY_NAME_FALLBACK = 'Admin';
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminUsersLoadError, setAdminUsersLoadError] = useState<string | null>(null);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [leadTitle, setLeadTitle] = useState<'Mr' | 'Miss' | 'Mrs' | ''>('');
  const loggedInAdminName = useMemo(() => {
    const viewerUserId = String(viewer.userId || '').trim();
    const viewerEmail = String(viewer.email || '').trim();
    if (!viewerUserId && !viewerEmail) return ADMIN_DISPLAY_NAME_FALLBACK;

    const u = (adminUsers || []).find((x) => {
      const id = String((x as any)?.userId || '').trim();
      const email = String((x as any)?.email || '').trim();
      return (viewerUserId && id === viewerUserId) || (viewerEmail && email === viewerEmail);
    });

    const label = String(
      (u as any)?.name ||
        (u as any)?.fullName ||
        (u as any)?.displayName ||
        (u as any)?.username ||
        (u as any)?.email ||
        viewerUserId ||
        viewerEmail
    ).trim();
    return label || ADMIN_DISPLAY_NAME_FALLBACK;
  }, [adminUsers, viewer.email, viewer.userId]);

  const adminLabel = useMemo(() => {
    const n = String(loggedInAdminName || '').trim() || ADMIN_DISPLAY_NAME_FALLBACK;
    return n;
  }, [loggedInAdminName]);

  // Composer extras
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [attachment, setAttachment] = useState<
    | null
    | {
        kind: 'image' | 'video' | 'document';
        file: File;
        objectUrl: string;
      }
  >(null);

  // NEW: Preview, Spell Check, AI Support, Enhanced Schedule
  const [showPreview, setShowPreview] = useState(false);
  const [spellingErrors, setSpellingErrors] = useState<Array<{ word: string; index: number }>>([]);
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showComposerTools, setShowComposerTools] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCorrecting, setAiCorrecting] = useState(false);
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

  const createLeadInitialPhone = selected?.phoneNumber || '';

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
      try {
        // IMPORTANT: Never call the bridge directly from the browser (CORS + mixed env issues).
        // Use the same-origin Next.js API proxy instead.
        const res = await crmFetch('/api/admin/crm/whatsapp/bridge/status');
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (cancelled || !data) return;

          const acct = data.account;
          const phone = acct?.phone || acct?.wid || acct?.pushname;
          setSenderLabel(phone ? String(phone) : '');
          setIsWhatsAppConnected(Boolean(data.authenticated ?? data.connected ?? data.isAuthenticated));
          return;
        }
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

  // Load persisted chat-sidebar width
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_SIDEBAR_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) {
        const clamped = Math.max(CHAT_SIDEBAR_MIN, Math.min(CHAT_SIDEBAR_MAX, n));
        setChatSidebarWidth(clamped);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load persisted tools-sidebar width
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TOOLS_SIDEBAR_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) {
        const clamped = Math.max(TOOLS_SIDEBAR_MIN, Math.min(TOOLS_SIDEBAR_MAX, n));
        setToolsSidebarWidth(clamped);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sidebar drag handlers
  const beginResizeChatSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = chatSidebarWidth;
    document.documentElement.classList.add('wa-no-select');
  }, [chatSidebarWidth]);

  const beginResizeToolsSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toolsResizingRef.current = true;
    toolsStartXRef.current = e.clientX;
    toolsStartWRef.current = toolsSidebarWidth;
    document.documentElement.classList.add('wa-no-select');
  }, [toolsSidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = e.clientX - startXRef.current;
      const next = Math.max(CHAT_SIDEBAR_MIN, Math.min(CHAT_SIDEBAR_MAX, startWRef.current + dx));
      setChatSidebarWidth(next);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.documentElement.classList.remove('wa-no-select');
      try {
        window.localStorage.setItem(CHAT_SIDEBAR_STORAGE_KEY, String(chatSidebarWidth));
      } catch {
        // ignore
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [chatSidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!toolsResizingRef.current) return;
      const dx = toolsStartXRef.current - e.clientX;
      const next = Math.max(TOOLS_SIDEBAR_MIN, Math.min(TOOLS_SIDEBAR_MAX, toolsStartWRef.current + dx));
      setToolsSidebarWidth(next);
    };
    const onUp = () => {
      if (!toolsResizingRef.current) return;
      toolsResizingRef.current = false;
      document.documentElement.classList.remove('wa-no-select');
      try {
        window.localStorage.setItem(TOOLS_SIDEBAR_STORAGE_KEY, String(toolsSidebarWidth));
      } catch {
        // ignore
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [toolsSidebarWidth]);

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
      const templatesFromApi =
        (Array.isArray(res?.data?.templates) ? res.data.templates : null) ??
        (Array.isArray(res?.templates) ? res.templates : null) ??
        [];
      setTemplates(templatesFromApi);
    } catch {
      setTemplates([]);
    } finally {
      setSavedLoading(false);
    }
  }, [crmFetch]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      setAdminUsersLoading(true);
      setAdminUsersLoadError(null);
      const res = await crmFetch('/api/admin/auth/users', { method: 'GET' });
      const rows = Array.isArray(res?.data) ? (res.data as AdminUserRow[]) : [];
      setAdminUsers(rows);
    } catch {
      setAdminUsers([]);
      setAdminUsersLoadError('Unable to load admin users. Please refresh or login again.');
    } finally {
      setAdminUsersLoading(false);
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
      if (!leadId || leadId === 'null' || leadId === 'undefined') {
        setNotes([]);
        return;
      }
      const res = await crmFetch(`/api/admin/crm/leads/${leadId}/notes`, {
        params: { limit: 50, skip: 0 },
      });
      setNotes(res?.notes || []);
    },
    [crmFetch]
  );

  const fetchFollowUps = useCallback(
    async (leadId: string) => {
      if (!leadId || leadId === 'null' || leadId === 'undefined') {
        setFollowups([]);
        return;
      }
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
        if (!leadId || leadId === 'null' || leadId === 'undefined') {
          setMessages([]);
          setNotes([]);
          setFollowups([]);
          return;
        }
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
    fetchAdminUsers();
  }, [token, router, fetchConversations, fetchQuickReplies]);

  // Lazy-load saved items depending on dropdown selection
  useEffect(() => {
    setSavedId('');
    if (savedKind === 'templates' && templates.length === 0 && !savedLoading) void fetchTemplates();
    if (savedKind === 'chatbots' && chatbots.length === 0 && !savedLoading) void fetchChatbots();
  }, [savedKind, templates.length, chatbots.length, fetchTemplates, fetchChatbots, savedLoading]);

  const selectedLeadName = useMemo(() => resolveLeadLabel(selected), [selected]);

  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const cutoffNewMs = 48 * 60 * 60 * 1000; // 48h
    const viewerUserId = String(viewer.userId || '').trim();
    const isSuperAdmin = viewerUserId === 'admincrm';
    const base = !isSuperAdmin && viewerUserId
      ? conversations.filter((c) => String(c.assignedToUserId || '').trim() === viewerUserId)
      : conversations;

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
  }, [conversations, chatBucket, label, viewer.userId]);

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

      // Hydrate lead title/name for consistent sender labeling
      try {
        const lead: any = await crmFetch(`/api/admin/crm/leads/${row.leadId}`, { method: 'GET' });
        const t = String(lead?.data?.title || lead?.title || '').trim();
  if (t === 'Mr' || t === 'Miss' || t === 'Mrs') setLeadTitle(t);
        else setLeadTitle('');
      } catch {
        setLeadTitle('');
      }

      await fetchThread(row.leadId);
    },
    [crmFetch, fetchThread]
  );

  const updateLeadDisplay = useCallback(
  async (opts: { title?: 'Mr' | 'Miss' | 'Mrs' | '' }) => {
      if (!selected) return;
      const name = String(selected.name || '').trim();
      const title = opts.title ?? leadTitle;
      const displayName = title ? `${title}. ${name}` : name;

      // Best-effort: API currently allows arbitrary fields via update object.
      await crmFetch(`/api/admin/crm/leads/${selected.leadId}` as any, {
        method: 'PUT',
        body: {
          title: title || '',
          displayName: displayName || undefined,
        },
      }).catch(() => null);
    },
    [crmFetch, leadTitle, selected]
  );

  // Deep-link support: open WhatsApp dashboard directly from a Lead row.
  // Example: /admin/crm/whatsapp?leadId=<mongoId>&phone=<number>
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    const leadId = String(searchParams.get('leadId') || '').trim();
    const phone = String(searchParams.get('phone') || '').trim();
    const initialMessage = String(searchParams.get('message') || '').trim();
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
      if (initialMessage) {
        try {
          setComposer(decodeURIComponent(initialMessage));
        } catch {
          setComposer(initialMessage);
        }
      }
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

        if (initialMessage) {
          try {
            setComposer(decodeURIComponent(initialMessage));
          } catch {
            setComposer(initialMessage);
          }
        }
      } catch {
        // Non-blocking
      }
    })();
  }, [conversations, crmFetch, handleSelect, searchParams]);

  // Setup card toggle handlers when component mounts
  useEffect(() => {
    const toggleCardContent = (cardId: string) => {
      const btn = document.getElementById(cardId);
      const content = document.getElementById(`${cardId}-content`);
      if (!btn || !content) return;

      // Set initial display state based on data-open attribute
      const isOpen = btn.getAttribute('data-open') === 'true';
      content.style.display = isOpen ? 'flex' : 'none';

      // Add click handler
      const handleClick = () => {
        const currentOpen = btn.getAttribute('data-open') === 'true';
        btn.setAttribute('data-open', currentOpen ? 'false' : 'true');
        content.style.display = currentOpen ? 'none' : 'flex';
      };

      btn.addEventListener('click', handleClick);
      return () => btn.removeEventListener('click', handleClick);
    };

    toggleCardContent('followup-card');
    toggleCardContent('notes-card');
    toggleCardContent('labels-card');
    toggleCardContent('status-card');
  }, []);

  const handleSend = async () => {
    if (!selected) return;
    if (!token) {
      setError('Session expired. Please refresh the page or login again.');
      return;
    }
    const text = composer.trim();
    const hasAttachment = Boolean(attachment?.file);
    const hasText = Boolean(text);

    const sendingTemplate = Boolean(selectedTemplate);
    if (sendingTemplate && hasAttachment) {
      setError('Attachments cannot be sent together with templates. Please remove the attachment or send as text.');
      return;
    }
    if (!sendingTemplate && !hasText && !hasAttachment) return;
    if (sendingTemplate && !selectedTemplate) return;

    try {
      setError(null);
      setSending(true);

      if (!token) {
        setError('Session expired. Please refresh the page or login again.');
        setSending(false);
        return;
      }

      console.log('📤 Sending message:', {
        leadId: selected.leadId,
        phone: selected.phoneNumber,
        text,
        headerText: headerText.trim() || undefined,
        footerText: footerText.trim() || undefined,
        attachment: attachment ? { kind: attachment.kind, name: attachment.file.name, size: attachment.file.size } : null,
      });

      let res: any;
      if (selectedTemplate) {
        res = await crmFetch('/api/admin/crm/whatsapp/send-template', {
          method: 'POST',
          body: {
            leadId: selected.leadId,
            phoneNumber: selected.phoneNumber,
            templateId: selectedTemplate.id,
          },
        });
      } else {
        // Send via CRM endpoint (handles bridge + fallback queue)
        const mediaPayload =
          attachment && attachment.file
            ? await new Promise<any>((resolve, reject) => {
                const r = new FileReader();
                r.onerror = () => reject(new Error('Failed to read attachment'));
                r.onload = () => {
                  const result = String(r.result || '');
                  const comma = result.indexOf(',');
                  const base64 = comma >= 0 ? result.slice(comma + 1) : result;
                  resolve({
                    kind: attachment.kind,
                    fileName: attachment.file.name,
                    mimeType: attachment.file.type,
                    sizeBytes: attachment.file.size,
                    base64,
                  });
                };
                r.readAsDataURL(attachment.file);
              })
            : null;

        res = await crmFetch('/api/admin/crm/whatsapp/send', {
          method: 'POST',
          body: {
            leadId: selected.leadId,
            phoneNumber: selected.phoneNumber,
            // If sending only media, keep messageContent as a non-empty string so the API accepts it.
            // Use a single whitespace so UI doesn't show a literal "(attachment)" message.
            messageContent: hasText ? text : ' ',
            headerText: headerText.trim() || undefined,
            footerText: footerText.trim() || undefined,
            media: mediaPayload || undefined,
            senderDisplayName: adminLabel,
          },
        });
      }

      console.log('✅ Response received:', res);

      // useCRM hook returns just the data object, so we check for messageId
      if (res?.messageId) {
        setComposer('');
        setHeaderText('');
        setFooterText('');
        setSelectedTemplate(null);
        if (attachment?.objectUrl) URL.revokeObjectURL(attachment.objectUrl);
        setAttachment(null);
        
        // Check if message is queued (bridge unavailable) or actually sent
        const messageStatus = res?.status;
        const warning = res?.warning;
        
        if (messageStatus === 'queued' && warning) {
          // Message was queued, show info instead of error
          console.log('⏳ Message queued:', warning);
          setError(`✓ Message queued - ${warning}`);
        } else if (messageStatus === 'sent') {
          console.log('✨ Message sent successfully');
          setError(null);
        }
        
        // Refresh thread to show message
        await fetchThread(selected.leadId);
      } else {
        console.error('❌ Unexpected response:', res);
        throw new Error(res?.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('❌ Send error:', err);
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

  // Multi-select for bulk assignment actions (left chat list)
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const lastClickedChatIndexRef = useRef<number | null>(null);

  // Bulk actions popup for selected chats
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  useEffect(() => {
    setBulkActionsOpen(selectedChatIds.size > 0);
  }, [selectedChatIds]);
  const adminUserOptions = useMemo(() => {
    const list = Array.isArray(adminUsers) ? adminUsers : [];
    const options = list
      .map((u: any) => {
        const userId = String(u?.userId || '').trim();
        if (!userId) return null;

        const label = String(
          u?.name || u?.fullName || u?.displayName || u?.username || u?.email || u?.userId
        ).trim();
        return { userId, label: label || userId };
      })
      .filter(Boolean) as Array<{ userId: string; label: string }>;

    // Dedupe by userId, prefer first label.
    const seen = new Set<string>();
    const deduped: Array<{ userId: string; label: string }> = [];
    for (const o of options) {
      if (seen.has(o.userId)) continue;
      seen.add(o.userId);
      deduped.push(o);
    }
    deduped.sort((a, b) => a.label.localeCompare(b.label));
    return deduped;
  }, [adminUsers]);
  const toggleChatSelection = useCallback((leadId: string, opts?: { force?: boolean }) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      const exists = next.has(leadId);
      const shouldSelect = opts?.force ?? !exists;
      if (shouldSelect) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }, []);

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

  const bulkAssignSelectedChats = useCallback(
    async (nextUserId: string | null) => {
      const ids = Array.from(selectedChatIds);
      if (!ids.length) return;

      await Promise.all(
        ids.map(async (leadId) => {
          try {
            const res = await crmFetch(`/api/admin/crm/leads/${leadId}`, {
              method: 'PUT',
              body: { assignedToUserId: nextUserId },
            });
            const updatedAssignedTo: string | undefined =
              res?.data?.assignedToUserId || (nextUserId || undefined);
            setConversations((prev) =>
              prev.map((c) => (c.leadId === leadId ? { ...c, assignedToUserId: updatedAssignedTo } : c))
            );
            setSelected((prev) =>
              prev?.leadId === leadId ? { ...prev, assignedToUserId: updatedAssignedTo } : prev
            );
          } catch (err) {
            console.error('Bulk assign failed for lead', leadId, err);
          }
        })
      );

      // Optional: clear selection after operation.
      setSelectedChatIds(new Set());
      lastClickedChatIndexRef.current = null;
    },
    [crmFetch, selectedChatIds]
  );

  const bulkUpdateLeadStatus = useCallback(
    async (nextStatus: string) => {
      const ids = Array.from(selectedChatIds);
      if (!ids.length) return;

      await Promise.all(
        ids.map(async (leadId) => {
          try {
            const res = await crmFetch(`/api/admin/crm/leads/${leadId}`, {
              method: 'PUT',
              body: { status: nextStatus },
            });
            const updatedStatus: string = String(res?.data?.status || nextStatus || '');
            setConversations((prev) => prev.map((c) => (c.leadId === leadId ? { ...c, status: updatedStatus } : c)));
            setSelected((prev) => (prev?.leadId === leadId ? { ...prev, status: updatedStatus } : prev));
          } catch (err) {
            console.error('Bulk status update failed for lead', leadId, err);
          }
        })
      );

      setSelectedChatIds(new Set());
      lastClickedChatIndexRef.current = null;
    },
    [crmFetch, selectedChatIds]
  );

  const clearBulkSelection = useCallback(() => {
    setSelectedChatIds(new Set());
    lastClickedChatIndexRef.current = null;
  }, []);

  const updateFollowUpStatus = useCallback(
    async (followUpId: string, newStatus: string) => {
      try {
        await crmFetch(`/api/admin/crm/leads/${selected?.leadId}/followups/${followUpId}`, {
          method: 'PUT',
          body: { status: newStatus },
        });
        // Refresh followups
        if (selected?.leadId) {
          const res = await crmFetch(`/api/admin/crm/leads/${selected.leadId}/followups`, {
            params: { limit: 50, skip: 0, status: 'all' },
          });
          setFollowups(res?.followups || []);
        }
      } catch (err) {
        console.error('Failed to update followup status:', err);
      }
    },
    [crmFetch, selected?.leadId]
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
    if (selectedTemplate) setSelectedTemplate(null);
    if (!spellCheckEnabled) {
      setSpellingErrors([]);
      return;
    }
    const errors = checkSpelling(text);
    setSpellingErrors(errors);
  };

  const applyAutocorrect = useCallback(async () => {
    const text = composer.trim();
    if (!text) return;

    try {
      setAiCorrecting(true);
      const response = await fetch('/api/admin/crm/ai-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composer }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        console.error('AI correct error:', data?.error || response.statusText);
        return;
      }

      const correctedText = data?.correctedText;
      if (typeof correctedText === 'string') {
        handleComposerChange(correctedText);
      }
    } catch (err) {
      console.error('AI correct error:', err);
    } finally {
      setAiCorrecting(false);
    }
  }, [composer, handleComposerChange]);

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

  const pickAttachment = (kind: 'image' | 'video' | 'document', file: File | null | undefined) => {
    if (!file) return;
    if (attachment?.objectUrl) URL.revokeObjectURL(attachment.objectUrl);
    setAttachment({ kind, file, objectUrl: URL.createObjectURL(file) });
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

  const fetchWhatsAppDiagnostics = useCallback(async () => {
    if (!token) {
      setWaDiagnosticsError('Missing admin token');
      return;
    }

    setWaDiagnosticsLoading(true);
    setWaDiagnosticsError(null);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/diagnostics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setWaDiagnostics(null);
        setWaDiagnosticsError(data?.error || 'Failed to load diagnostics');
        return;
      }
      setWaDiagnostics(data?.data || data);
    } catch (e) {
      setWaDiagnostics(null);
      setWaDiagnosticsError(e instanceof Error ? e.message : 'Diagnostics request failed');
    } finally {
      setWaDiagnosticsLoading(false);
    }
  }, [token]);

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

        <div className="wa-card" style={{ margin: '8px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>WhatsApp diagnostics</div>
            <button
              type="button"
              onClick={fetchWhatsAppDiagnostics}
              disabled={waDiagnosticsLoading}
              className="wa-btn wa-btn--orange"
              style={{ fontSize: 12, padding: '6px 10px' }}
            >
              {waDiagnosticsLoading ? 'Checking…' : 'Run'}
            </button>
          </div>

          {waDiagnosticsError ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#B91C1C' }}>{waDiagnosticsError}</div>
          ) : null}

          {waDiagnostics ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#374151', display: 'grid', gap: 6 }}>
              <div>
                <strong>Meta:</strong>{' '}
                {String(waDiagnostics?.meta?.connected ?? waDiagnostics?.metaConnected ?? 'unknown')}
                {waDiagnostics?.meta?.message ? ` — ${waDiagnostics.meta.message}` : ''}
              </div>
              <div>
                <strong>Bridge:</strong>{' '}
                {String(waDiagnostics?.bridge?.reachable ?? waDiagnostics?.bridgeReachable ?? 'unknown')}
                {waDiagnostics?.bridge?.authenticated != null
                  ? ` (authenticated: ${String(waDiagnostics.bridge.authenticated)})`
                  : ''}
                {waDiagnostics?.bridge?.message ? ` — ${waDiagnostics.bridge.message}` : ''}
              </div>
            </div>
          ) : null}
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
  <aside
          className="chat-sidebar"
          style={{ width: chatSidebarWidth, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
        {bulkActionsOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            className="saved-modal-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: 80 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) clearBulkSelection();
            }}
          >
            <div className="saved-modal" style={{ maxWidth: 720 }}>
              <div className="saved-modal-title">Chat Actions ({selectedChatIds.size} selected)</div>
              <div className="saved-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <button
                    type="button"
                    className="wa-btn wa-btn--green"
                    onClick={() => {
                      setActionModal('assign');
                    }}
                  >
                    👤 Assign user
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--orange"
                    onClick={() => {
                      setActionModal('status');
                    }}
                  >
                    🏷️ Change status
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--orange"
                    onClick={() => {
                      // Use existing right-sidebar Labels tool for the currently opened chat.
                      // For bulk: make it easy to update the main selected chat, then repeat.
                      setChatBucket('labels');
                      clearBulkSelection();
                    }}
                    title="Use Labels in right sidebar"
                  >
                    🏷️ Change label(s)
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--green"
                    onClick={() => {
                      setCreateLeadOpen(true);
                      clearBulkSelection();
                    }}
                  >
                    ➕ Add in leads
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--orange"
                    onClick={async () => {
                      // Minimal: map archive -> status=inactive (keeps data, hides in "active" workflows)
                      await bulkUpdateLeadStatus('inactive');
                    }}
                    title="Archive selected chats (sets status to inactive)"
                  >
                    🗄️ Archive
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--orange"
                    onClick={async () => {
                      // Minimal: map block -> status=inactive (plus visual filter) until a dedicated blocklist exists
                      await bulkUpdateLeadStatus('inactive');
                    }}
                    title="Block selected chats (currently maps to inactive)"
                  >
                    🚫 Block
                  </button>

                  <button
                    type="button"
                    className="wa-btn wa-btn--red"
                    disabled={bulkDeleting || selectedChatIds.size === 0}
                    onClick={async () => {
                      const ok = window.confirm(
                        `Delete chat history from database for ${selectedChatIds.size} selected chat(s)? This cannot be undone.`
                      );
                      if (!ok) return;

                      try {
                        setBulkDeleting(true);
                        setError(null);

                        const leadIds = Array.from(selectedChatIds);
                        const token = localStorage.getItem('admin_token');
                        const res = await fetch('/api/admin/crm/whatsapp/conversations/delete', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ leadIds }),
                        });

                        if (!res.ok) {
                          const j = await res.json().catch(() => ({}));
                          throw new Error(j?.error || 'Failed to delete chat');
                        }

                        clearBulkSelection();
                        await fetchConversations();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to delete chat');
                      } finally {
                        setBulkDeleting(false);
                      }
                    }}
                  >
                    🗑️ {bulkDeleting ? 'Deleting…' : 'Delete chat'}
                  </button>

                  <Link className="wa-btn" href="/admin/crm/leads" onClick={() => clearBulkSelection()}>
                    📇 Open Leads
                  </Link>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Tools</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Link className="wa-btn" href="/admin/crm/whatsapp/templates" onClick={() => clearBulkSelection()}>
                      🧾 Templates
                    </Link>
                    <Link className="wa-btn" href="/admin/crm/chatbots" onClick={() => clearBulkSelection()}>
                      🤖 Chatbots
                    </Link>
                    <Link className="wa-btn" href="/admin/crm/automation" onClick={() => clearBulkSelection()}>
                      ⚡ Automation
                    </Link>
                    <Link className="wa-btn" href="/admin/crm/leads-followup" onClick={() => clearBulkSelection()}>
                      📅 Followup
                    </Link>
                  </div>
                </div>
              </div>

              <div className="saved-modal-actions" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="wa-btn" onClick={() => clearBulkSelection()}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

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

          <div className="chat-sidebar-actions" aria-label="Chat sidebar quick actions">
            <button
              type="button"
              onClick={() => fetchConversations({ silent: false })}
              className="wa-btn chat-action-btn chat-action-btn--refresh"
              title="Refresh"
              aria-label="Refresh"
            >
              <span className="chat-action-text">Refresh</span>
            </button>

            <button
              type="button"
              className="wa-btn chat-action-btn"
              title="Label"
              aria-label="Label"
              aria-pressed={chatBucket === 'labels'}
              onClick={() => {
                setChatBucket('labels');
                // If user hasn't typed a label yet, focus the label filter input for quick use.
                requestAnimationFrame(() => {
                  try {
                    const el = document.querySelector('input[placeholder="Label"]') as HTMLInputElement | null;
                    el?.focus();
                  } catch {
                    // ignore
                  }
                });
              }}
            >
              <span className="chat-action-text">Label</span>
            </button>

            {chatBucket === 'unread' ? (
              <button
                type="button"
                className="wa-btn chat-action-btn"
                title="Read"
                aria-label="Read"
                onClick={() => setChatBucket('all')}
              >
                <span className="chat-action-text">Read</span>
              </button>
            ) : (
              <button
                type="button"
                className="wa-btn chat-action-btn"
                title="Unread"
                aria-label="Unread"
                onClick={() => {
                  setChatBucket('unread');
                  // Optional: ensure freshest unread counts
                  fetchConversations({ silent: true });
                }}
              >
                <span className="chat-action-text">Unread</span>
              </button>
            )}
          </div>
        </div>

        <div className="chat-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loadingConversations ? (
            <div style={{ padding: 16 }}>
              <LoadingSpinner />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 16, color: '#6B7280', fontSize: 13 }}>No chats found.</div>
          ) : (
            filteredConversations.map((c, idx) => {
              const active = selected?.leadId === c.leadId;
              const isChecked = selectedChatIds.has(c.leadId);
              return (
                <button
                  key={c.leadId}
                  type="button"
                  className={`chat-item${active ? ' active' : ''}`}
                  onClick={(e) => {
                    // If user clicks the checkbox area, selection is handled there.
                    // Normal click still opens the conversation.
                    if ((e.target as HTMLElement | null)?.closest?.('.chat-select')) return;
                    handleSelect(c);
                  }}
                >
                  <div className="chat-item-row">
                    <div
                      className="chat-select"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Shift-click selects a range in the current filtered list
                        if (e.shiftKey && lastClickedChatIndexRef.current != null) {
                          const start = Math.min(lastClickedChatIndexRef.current, idx);
                          const end = Math.max(lastClickedChatIndexRef.current, idx);
                          setSelectedChatIds((prev) => {
                            const next = new Set(prev);
                            for (let i = start; i <= end; i++) {
                              const id = filteredConversations[i]?.leadId;
                              if (id) next.add(id);
                            }
                            return next;
                          });
                        } else {
                          toggleChatSelection(c.leadId);
                        }
                        lastClickedChatIndexRef.current = idx;
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          // handled by onClick wrapper
                        }}
                        aria-label={`Select chat ${resolveLeadLabel(c)}`}
                      />
                    </div>

                    <div className="chat-avatar" aria-hidden="true">
                      {getInitials(resolveLeadLabel(c))}
                    </div>

                    <div className="chat-item-body">
                      <div className="chat-item-top">
                        <div className="chat-name">{resolveLeadLabel(c)}</div>
                        <div className="chat-time">
                          {c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}
                        </div>
                      </div>

                      <div className="chat-preview">{c.lastMessageContent || ''}</div>

                      <div className="chat-meta">
                        {c.phoneNumber}
                        {c.lastMessageAt ? ` • ${formatDay(c.lastMessageAt)}` : ''}
                      </div>
                    </div>

                    {c.unreadCount ? (
                      <div className="chat-unread">
                        <div className="chat-badge">{c.unreadCount}</div>
                        <div className="chat-unread-dot" aria-hidden="true" />
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Drag handle (resizable sidebar) */}
        <div
          className="chat-sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat list"
          onMouseDown={beginResizeChatSidebar}
          title="Drag to resize"
        />
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

        <div className="chat-header" style={{ padding: '10px 12px' }}>
          <div>
            <div>{selectedLeadName}</div>
            <div className="sub">{selected?.phoneNumber || 'Select a chat to start'}</div>
            {/* Keep the header minimal (chips moved to right sidebar tools panel) */}
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

            {/* Broadcast button (near chatbot section) */}
            <Link
              href="/admin/crm/broadcast"
              className="wa-btn"
              style={{
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#111827',
                fontWeight: 900,
                textDecoration: 'none',
                marginRight: 8,
              }}
              title="Open broadcast"
            >
              📣 Broadcast
            </Link>

            {/* Create lead button (placed next to refresh, near customer number) */}
            <button
              type="button"
              onClick={() => setCreateLeadOpen(true)}
              title="Create lead"
              style={{
                height: 34,
                width: 34,
                borderRadius: 999,
                background: '#DC2626',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(220,38,38,0.25)',
              }}
            >
              +
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

          <Link
            className="action-icon link"
            href="/admin/crm/broadcast"
            aria-label="Open broadcast"
            title="Open broadcast"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M4 4h16v2H4V4Zm2 5h12v2H6V9Zm-2 5h16v2H4v-2Zm2 5h12v2H6v-2Z"
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

  <div ref={listRef} className="chat-messages" style={{ background: '#fff', paddingTop: 6 }}>
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
                  const leadName = String(selected?.name || selectedLeadName || '').trim();
                  const userLabel = leadTitle
                    ? `${leadTitle}${leadTitle ? '.' : ''} ${leadName}`.trim()
                    : leadName;
                  const senderName = inbound ? userLabel : (m as any)?.senderDisplayName || adminLabel;
                  return (
                    <div key={m._id} className={`msg ${inbound ? 'in' : 'out'}`}>
                      <div className="msg-sender" style={{ fontSize: 11, opacity: 0.75, marginBottom: 3 }}>
                        {senderName}
                      </div>

                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.messageContent}</div>
                      <div className="msg-meta">
                        <span>{formatTime(m.sentAt || m.createdAt)}</span>
                        {!inbound ? <MessageStatusTicks status={m.status} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* MESSAGE COMPOSER (Like WATI) */}
  <div className="saved-picker" style={{ paddingTop: 4, paddingBottom: 4 }}>
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
                    setSelectedTemplate(null);
                    setComposer(item.content);
                    composerRef.current?.focus();
                  }
                  return;
                }

                if (savedKind === 'templates') {
                  const t = templates.find((x) => x._id === id);
                  if (t?.templateContent) {
                    setSelectedTemplate({
                      id: t._id,
                      name: t.templateName,
                      body: t.templateContent,
                      buttons: Array.isArray(t.buttons) ? t.buttons : [],
                      headerMedia: t.headerMedia?.url
                        ? {
                            kind: t.headerMedia.kind,
                            url: t.headerMedia.url,
                          }
                        : undefined,
                    });
                    setComposer(t.templateContent);
                    composerRef.current?.focus();
                  }
                  return;
                }

                if (savedKind === 'chatbots') {
                  const r = chatbots.find((x) => x._id === id);
                  if (String(r?.actionType || '') === 'send_text' && r?.actionText) {
                    setSelectedTemplate(null);
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

        {/* Composer extras moved into symbolic toolbar near the message box */}

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
                    {adminUsersLoading ? (
                      <div style={{ marginTop: 6, color: '#6B7280', fontSize: 12 }}>
                        Loading admin users…
                      </div>
                    ) : adminUsersLoadError ? (
                      <div style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>
                        {adminUsersLoadError}
                      </div>
                    ) : null}
                    <label>
                      Assign to admin
                      <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                        <option value="">Unassigned</option>
                        {adminUserOptions.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedChatIds.size ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid #E5E7EB',
                          background: '#F9FAFB',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Bulk assign</div>
                        <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 10 }}>
                          Selected chats: {selectedChatIds.size}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={async () => {
                            await bulkAssignSelectedChats(assignUserId ? assignUserId : null);
                            setActionModal(null);
                          }}
                        >
                          Assign selected
                        </button>
                      </div>
                    ) : null}
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
                        await updateAssignedTo(v ? v : null);
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
                  <textarea
                    id="qr-content"
                    name="qr-content"
                    value={qrContent}
                    onChange={(e) => setQrContent(e.target.value)}
                    rows={4}
                    placeholder="Write the reply…"
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="sentences"
                  />
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
            <div
              onClick={() => {
                setShowAttachmentMenu(false);
                setShowComposerTools(false);
              }}
              onFocusCapture={() => {
                setShowAttachmentMenu(false);
              }}
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: showAttachmentMenu || showComposerTools ? 'auto' : 'none',
              }}
            />
            {selected && attachment ? (
              <div style={{ padding: '6px 2px 2px' }}>
                <div className="wa-attachment-pill" style={{ maxWidth: '100%', flexWrap: 'wrap' as any }}>
                  <strong>{attachment.kind}</strong>: {attachment.file.name} ({Math.round(attachment.file.size / 1024)}kb)
                  <button
                    className="wa-attachment-remove"
                    onClick={() => {
                      if (attachment.objectUrl) URL.revokeObjectURL(attachment.objectUrl);
                      setAttachment(null);
                    }}
                    type="button"
                    title="Remove attachment"
                    aria-label="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : null}

            {selected && selectedTemplate ? (
              <div style={{ padding: '6px 2px 2px' }}>
                <div
                  style={{
                    border: '1px solid rgba(17, 24, 39, 0.12)',
                    borderRadius: 14,
                    background: '#F9FAFB',
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                    Template: {selectedTemplate.name}
                  </div>
                  {selectedTemplate.headerMedia?.kind === 'image' && selectedTemplate.headerMedia.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedTemplate.headerMedia.url}
                      alt="template header"
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginTop: 8 }}
                    />
                  ) : null}

                  <div style={{ marginTop: 8, fontSize: 13, color: '#111827', whiteSpace: 'pre-wrap' }}>
                    {selectedTemplate.body}
                  </div>

                  {selectedTemplate.buttons?.length ? (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {selectedTemplate.buttons.map((b, idx) => (
                        <div
                          key={`${String(b?.title || 'btn')}-${idx}`}
                          style={{
                            border: '1px solid rgba(17, 24, 39, 0.12)',
                            borderRadius: 10,
                            background: '#fff',
                            padding: '10px 12px',
                            textAlign: 'center',
                            fontSize: 13,
                            color: '#111827',
                          }}
                        >
                          {String(b?.title || 'Button')}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>
                    This is a CRM preview. Current sending mode stores the template and sends the body as text.
                  </div>
                </div>
              </div>
            ) : null}

            <textarea
              id="message-composer"
              name="message-composer"
              ref={composerRef}
              value={composer}
              onChange={(e) => handleComposerChange(e.target.value)}
              placeholder={selected ? 'Type a message…' : 'Select a conversation to start'}
              disabled={!selected || sending}
              rows={2}
              // Important: spellcheck is a browser feature. It only shows red underlines
              // if the user’s browser/OS has spellcheck dictionaries enabled.
              // Also, it works only for "text" inputs — our emoji/symbol-only text won't be flagged.
              spellCheck={spellCheckEnabled}
              lang="en"
              autoCorrect="on"
              autoCapitalize="sentences"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ 
                paddingRight: '210px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            
            {/* Tools (+) + Send + AI inside input area (right side) */}
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              display: 'flex', 
              gap: '8px',
              alignItems: 'center'
            }}>
              {/* Iconic '+' tools button */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposerTools((v) => !v);
                    setShowAttachmentMenu(false);
                  }}
                  disabled={!selected || sending}
                  title="Tools"
                  aria-label="Tools"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: '1px solid rgba(17, 24, 39, 0.18)',
                    background: '#fff',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.06)',
                  }}
                >
                  +
                </button>

                {showComposerTools ? (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 40,
                      right: 0,
                      zIndex: 25,
                      width: 260,
                      background: '#ffffff',
                      border: '1px solid rgba(17, 24, 39, 0.12)',
                      borderRadius: 12,
                      boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
                      padding: 10,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                      <button
                        type="button"
                        disabled={!composer.trim() || aiCorrecting}
                        onClick={async () => {
                          await applyAutocorrect();
                          setShowComposerTools(false);
                        }}
                        className="wa-btn"
                        style={{ padding: '8px 10px', fontSize: 13, gridColumn: '1 / span 2' }}
                        title="Auto-correct spelling + grammar"
                      >
                        {aiCorrecting ? '⏳ Auto-correct…' : '✅ Auto-correct'}
                      </button>

                      <button
                        type="button"
                        disabled={!selected}
                        onClick={() => {
                          setShowEmojiPicker(true);
                          setShowComposerTools(false);
                        }}
                        className="wa-btn"
                        style={{ padding: '8px 10px', fontSize: 13 }}
                      >
                        😊 Emoji
                      </button>

                      <button
                        type="button"
                        disabled={!composer.trim()}
                        onClick={() => {
                          setShowPreview(true);
                          setShowComposerTools(false);
                        }}
                        className="wa-btn"
                        style={{ padding: '8px 10px', fontSize: 13 }}
                      >
                        👁️ Preview
                      </button>

                      <button
                        type="button"
                        disabled={!selected || sending}
                        onClick={() => {
                          setSpellCheckEnabled((prev) => {
                            const next = !prev;
                            if (!next) setSpellingErrors([]);
                            return next;
                          });
                        }}
                        className="wa-btn"
                        style={{ padding: '8px 10px', fontSize: 13 }}
                        title={spellCheckEnabled ? 'Spellcheck: On' : 'Spellcheck: Off'}
                      >
                        {spellCheckEnabled ? '✓ Spell On' : '✓ Spell Off'}
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: spellingErrors.length ? '#92400e' : '#6B7280',
                          background: spellingErrors.length ? '#fef3c7' : '#f3f4f6',
                          border: '1px solid #E5E7EB',
                          borderRadius: 10,
                          padding: '8px 10px',
                          whiteSpace: 'nowrap',
                        }}
                        title={
                          spellCheckEnabled && spellingErrors.length
                            ? `${spellingErrors.length} spelling error${spellingErrors.length > 1 ? 's' : ''}`
                            : 'Spelling OK'
                        }
                      >
                        ⚠️ {spellingErrors.length || 0}
                      </div>
                    </div>

                    <div style={{ height: 1, background: '#E5E7EB', margin: '10px 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                      <label className="wa-btn" style={{ padding: '8px 10px', fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer' }}>
                        🖼️ Image
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={sending}
                          onChange={(e) => {
                            pickAttachment('image', e.target.files?.[0]);
                            setShowComposerTools(false);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <label className="wa-btn" style={{ padding: '8px 10px', fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer' }}>
                        🎥 Video
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: 'none' }}
                          disabled={sending}
                          onChange={(e) => {
                            pickAttachment('video', e.target.files?.[0]);
                            setShowComposerTools(false);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <label className="wa-btn" style={{ padding: '8px 10px', fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer' }}>
                        📄 Doc
                        <input
                          type="file"
                          accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                          style={{ display: 'none' }}
                          disabled={sending}
                          onChange={(e) => {
                            pickAttachment('document', e.target.files?.[0]);
                            setShowComposerTools(false);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="send-btn"
                onClick={handleSend}
                disabled={!selected || sending || (!composer.trim() && !attachment)}
                aria-label="Send message (Enter)"
                title="Send message (Shift+Enter for new line)"
                style={{ padding: '8px 12px', borderRadius: 10, minWidth: 60 }}
              >
                {sending ? '⏳' : 'Send'}
              </button>

              <button
                type="button"
                onClick={getAISuggestions}
                disabled={aiLoading || !composer.trim()}
                title="Get AI suggestions (Ctrl+K)"
                style={{
                  padding: '8px 10px',
                  background: '#f0f0f0',
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#111827',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '64px',
                  justifyContent: 'center',
                }}
              >
                {aiLoading ? '⏳' : '✨ AI'}
              </button>
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

          {/* Send + AI moved into input area */}
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

  {/* RIGHT SIDEBAR - Lead tools with collapsible sections */}
  <aside className="tools-sidebar" style={{ display: 'flex', flexDirection: 'column', padding: '0', width: toolsSidebarWidth, position: 'relative' }}>
        {/* Drag handle (resizable sidebar) */}
        <div
          className="tools-sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize tools panel"
          onMouseDown={beginResizeToolsSidebar}
          title="Drag to resize"
        />
        {/* Header */}
        <div className="tools-sidebar-header">
          <h3>Lead Tools</h3>
        </div>

  {/* Content - Scrollable */}
  <div className="tools-sidebar-content">
          {!selected ? (
            <div style={{ color: '#6B7280', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
              Select a conversation to use tools
            </div>
          ) : loadingTools ? (
            <div style={{ color: '#6B7280', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
              Loading...
            </div>
          ) : (
            <>
              {/* FOLLOW-UPS CARD */}
              <div className="tools-card">
                <button
                  type="button"
                  className="tools-card-header"
                  onClick={() => {
                    const card = document.getElementById('followup-card');
                    if (card) {
                      const next = card.getAttribute('data-open') === 'true' ? 'false' : 'true';
                      card.setAttribute('data-open', next);
                      card.setAttribute('aria-expanded', next === 'true' ? 'true' : 'false');
                    }
                  }}
                  id="followup-card"
                  data-open="true"
                  aria-expanded="true"
                  aria-controls="followup-card-content"
                >
                  <span className="tools-card-checkbox" aria-hidden="true"></span>
                  <span>Follow-ups</span>
                  <span className="tools-card-count">{followups.length}</span>
                </button>
                <div id="followup-card-content" className="tools-card-body">
                  {/* Create Follow-up Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      value={newFollowUpTitle} 
                      onChange={(e) => setNewFollowUpTitle(e.target.value)}
                      placeholder="Title"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={newFollowUpDueAt} 
                      onChange={(e) => setNewFollowUpDueAt(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button
                      type="button" 
                      onClick={createFollowUp}
                      style={{
                        padding: '8px 12px',
                        background: '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                      }}
                    >
                      Add Follow-up
                    </button>
                  </div>

                  {/* Follow-ups List */}
                  {followups.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {followups.map((f) => {
                        const status = getFollowUpStatus(f.dueAt, f.status);
                        const statusColor = status === 'done' ? '#10B981' : status === 'in-progress' ? '#F59E0B' : status === 'overdue' ? '#EF4444' : '#6B7280';
                        const statusBg = status === 'done' ? '#ECFDF5' : status === 'in-progress' ? '#FFFBEB' : status === 'overdue' ? '#FEF2F2' : '#F3F4F6';
                        return (
                          <div
                            key={f._id}
                            style={{
                              padding: '12px',
                              background: statusBg,
                              border: `1px solid ${statusColor}`,
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '13px', marginBottom: '6px' }}>
                              {f.title || 'Follow-up'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                              Due: {formatDay(f.dueAt)} {formatTime(f.dueAt)}
                            </div>
                            <select 
                              value={status}
                              onChange={(e) => updateFollowUpStatus(f._id, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: `1px solid ${statusColor}`,
                                borderRadius: '4px',
                                background: '#fff',
                                color: statusColor,
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="done">Done</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                      No follow-ups yet
                    </div>
                  )}
                </div>
              </div>

              {/* NOTES CARD */}
              <div className="tools-card">
                <button
                  type="button"
                  className="tools-card-header"
                  onClick={() => {
                    const card = document.getElementById('notes-card');
                    if (card) {
                      const next = card.getAttribute('data-open') === 'true' ? 'false' : 'true';
                      card.setAttribute('data-open', next);
                      card.setAttribute('aria-expanded', next === 'true' ? 'true' : 'false');
                    }
                  }}
                  id="notes-card"
                  data-open="false"
                  aria-expanded="false"
                  aria-controls="notes-card-content"
                >
                  <span className="tools-card-checkbox" aria-hidden="true"></span>
                  <span>Notes</span>
                  <span className="tools-card-count">{notes.length}</span>
                </button>
                <div id="notes-card-content" className="tools-card-body">
                  {/* Create Note Form */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write a note..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          createNote();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={createNote}
                      style={{
                        padding: '8px 12px',
                        background: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#10B981')}
                    >
                      Save
                    </button>
                  </div>

                  {/* Notes List */}
                  {notes.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notes.map((n) => (
                        <div key={n._id} style={{ 
                          padding: '12px', 
                          background: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}>
                          <div style={{ color: '#1F2937', fontSize: '13px', whiteSpace: 'pre-wrap', marginBottom: '6px' }}>
                            {n.note}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                            {formatDay(n.createdAt)} {formatTime(n.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                      No notes yet
                    </div>
                  )}
                </div>
              </div>

              {/* LABELS CARD */}
              <div className="tools-card">
                <button
                  type="button"
                  className="tools-card-header"
                  onClick={() => {
                    const card = document.getElementById('labels-card');
                    if (card) {
                      const next = card.getAttribute('data-open') === 'true' ? 'false' : 'true';
                      card.setAttribute('data-open', next);
                      card.setAttribute('aria-expanded', next === 'true' ? 'true' : 'false');
                    }
                  }}
                  id="labels-card"
                  data-open="true"
                  aria-expanded="true"
                  aria-controls="labels-card-content"
                >
                  <span className="tools-card-checkbox" aria-hidden="true"></span>
                  <span>Labels</span>
                  <span className="tools-card-count">{(selected?.labels || []).length}</span>
                </button>
                <div id="labels-card-content" className="tools-card-body">
                  {/* Add Label Form */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Add label..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void addLabelToSelected();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => void addLabelToSelected()}
                      style={{
                        padding: '8px 12px',
                        background: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#10B981')}
                    >
                      Add
                    </button>
                  </div>

                  {/* Labels List */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FCA5A5';
                            e.currentTarget.style.borderColor = '#DC2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FEE2E2';
                            e.currentTarget.style.borderColor = '#FECACA';
                          }}
                        >
                          {l}
                          <span style={{ fontWeight: 'bold' }}>x</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ color: '#9CA3AF', fontSize: '13px', width: '100%', textAlign: 'center', padding: '16px' }}>
                        No labels yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STATUS CARD */}
              <div className="tools-card">
                <button
                  type="button"
                  className="tools-card-header"
                  onClick={() => {
                    const card = document.getElementById('status-card');
                    if (card) {
                      const next = card.getAttribute('data-open') === 'true' ? 'false' : 'true';
                      card.setAttribute('data-open', next);
                      card.setAttribute('aria-expanded', next === 'true' ? 'true' : 'false');
                    }
                  }}
                  id="status-card"
                  data-open="false"
                  aria-expanded="false"
                  aria-controls="status-card-content"
                >
                  <span className="tools-card-checkbox" aria-hidden="true"></span>
                  <span>Status</span>
                </button>
                <div id="status-card-content" className="tools-card-body">
                  <select 
                    value={selected?.status || 'lead'}
                    onChange={(e) => updateLeadStatus(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#1F2937',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* NEW: WhatsApp Web QR Modal */}
      <QRConnectionModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onConnected={() => setIsWhatsAppConnected(true)}
      />

      <CreateLeadModal
        isOpen={createLeadOpen}
        token={token}
        onClose={() => setCreateLeadOpen(false)}
        initialPhone={createLeadInitialPhone}
      />
    </div>
  );
}
