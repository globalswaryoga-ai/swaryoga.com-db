'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // Added useCallback
import { useAuth, isValidAdminToken } from '@/hooks/useAuth';
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
import MetaWhatsAppSetupCard from '@/components/admin/crm/MetaWhatsAppSetupCard';
import {
  Search,
  Plus,
  Settings,
  User,
  UserPlus,
  Users,
  Tag,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Phone,
  Calendar,
  CalendarPlus,
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  Hash,
  Sparkles,
  Wand2,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  MessageSquare,
  Radio,
  FileText,
  Image as ImageIcon,
  Video,
  Play,
  RotateCcw,
  CheckCircle,
  CheckCircle2,
  ShieldAlert,
  Ban,
  Trash2,
  Copy,
  ExternalLink,
  Wrench,
  Megaphone,
  Zap,
  Download,
  Share2,
  Loader2,
  Save,
  Unlock,
  Archive,
  BarChart3,
  Flame,
  UserCheck,
  MoreVertical,
  Globe,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Camera,
  Mic
} from 'lucide-react';

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
  metadata?: Record<string, any>;
};

type Message = {
  _id: string;
  leadId: string;
  messageContent: string;
  messageType?: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  sentAt?: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  failureReason?: string;
  media?: {
    kind?: 'image' | 'video' | 'document' | 'audio' | 'sticker';
    url?: string;
    fileName?: string;
    mimeType?: string;
  };
  sentByLabel?: string;
  senderDisplayName?: string;
  provider?: string;
  waMessageId?: string;
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

// Lead Stage filter values shown in the inbox filter bar. "negotiation" is
// relabelled "Connected" here — it means the lead is interested and ready to pay.
type LeadStageFilter = 'all' | 'new_lead' | 'interested' | 'negotiation';

const LEAD_STAGE_LEGACY_MAP: Record<string, string> = {
  'lead': 'new_lead', 'hot': 'interested', 'prospect': 'contacted', 'customer': 'enrolled',
};

const LEAD_STAGE_COLOR_MAP: Record<string, string> = {
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

const LEAD_STAGE_LABEL_MAP: Record<string, string> = {
  'new_lead': 'New Lead', 'contacted': 'Contacted', 'interested': 'Interested',
  'demo_trial': 'Demo/Trial', 'negotiation': 'Connected', 'enrolled': 'Enrolled',
  'completed': 'Completed', 'inactive': 'Inactive', 'repeater': 'Repeater',
  'old_sadhak': 'Old Sadhak', 'only_for_post': 'Only for Post',
};

function mapLeadStage(rawStatus?: string | null): { key: string; label: string; colorClass: string } {
  const raw = (rawStatus || 'new_lead').toLowerCase();
  const key = LEAD_STAGE_LEGACY_MAP[raw] || raw;
  return {
    key,
    label: LEAD_STAGE_LABEL_MAP[key] || key.replace(/_/g, ' '),
    colorClass: LEAD_STAGE_COLOR_MAP[key] || 'text-blue-700 bg-blue-50 border border-blue-100',
  };
}

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

function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (phone.startsWith('+')) return phone;
  return `+${digits || phone}`;
}

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-sky-600',
];

function getAvatarGradient(nameOrPhone?: string | null): string {
  if (!nameOrPhone) return AVATAR_GRADIENTS[0];
  let sum = 0;
  for (let i = 0; i < nameOrPhone.length; i++) {
    sum += nameOrPhone.charCodeAt(i);
  }
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

function getInitials(name?: string | null, phone?: string | null): string {
  if (name && name.trim() && name !== 'Unknown User' && !name.match(/^\+?\d+$/)) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-2) || 'WA';
  }
  return 'WA';
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.03C9.31 7.03 9.1 7.04 8.92 7.38C8.74 7.72 8.21 8.22 8.21 9.27C8.21 10.32 8.98 11.33 9.09 11.47C9.2 11.61 10.6 13.78 12.75 14.71C14.54 15.48 14.9 15.33 15.29 15.29C15.68 15.25 16.54 14.78 16.72 14.28C16.9 13.78 16.9 13.36 16.84 13.27C16.78 13.18 16.63 13.12 16.41 13.01C16.19 12.9 15.11 12.37 14.91 12.3C14.71 12.23 14.57 12.19 14.43 12.41C14.29 12.63 13.88 13.11 13.75 13.25C13.62 13.39 13.5 13.41 13.28 13.3C13.06 13.19 12.36 12.96 11.53 12.22C10.88 11.64 10.45 10.93 10.32 10.71C10.2 10.49 10.31 10.37 10.42 10.26C10.52 10.16 10.64 10 10.75 9.87C10.86 9.74 10.9 9.64 10.97 9.5C11.04 9.36 11 9.24 10.95 9.13C10.9 9.02 10.46 7.94 10.28 7.5C10.1 7.07 9.92 7.13 9.78 7.12C9.65 7.11 9.5 7.11 9.35 7.11L9.53 7.03Z"/>
    </svg>
  );
}

function MessengerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.453 5.518 3.734 7.21V22l3.39-1.86c.92.256 1.895.394 2.876.394 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.445l-2.73-2.91-5.326 2.91 5.856-6.216 2.796 2.91 5.26-2.91-5.856 6.216z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function getValidAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of ['adminToken', 'admin_token', 'crm_token']) {
    const raw = localStorage.getItem(key);
    if (raw && raw !== 'null' && raw !== 'undefined' && isValidAdminToken(raw.trim())) {
      return raw.trim();
    }
  }
  if (typeof document !== 'undefined' && document.cookie) {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      const key = k.trim();
      if (['adminToken', 'admin_token', 'crm_token'].includes(key)) {
        const val = decodeURIComponent(v.join('=')).trim();
        if (val && val !== 'null' && val !== 'undefined' && isValidAdminToken(val)) {
          return val;
        }
      }
    }
  }
  return null;
}

export default function MetaInboxPage({ onLogout }: { onLogout?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { fetch: crmFetch, loading: crmLoading, error: crmError } = useCRM({ token });

  // Embedded login states for unauthenticated access on mobile / android app
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Check admin session on mount and listen to storage events
  useEffect(() => {
    const valid = getValidAdminToken();
    setToken(valid);
    setAuthChecked(true);

    const syncAuth = () => {
      const t = getValidAdminToken();
      setToken(t);
    };
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const handleAdminLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('crm_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('adminUser');
      if (typeof document !== 'undefined') {
        document.cookie = 'adminToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
        document.cookie = 'admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
        document.cookie = 'crm_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
      }
    }
    setToken(null);
    setConversations([]);
    setSelected(null);
    setMessages([]);
    if (onLogout) onLogout();
  }, [onLogout]);

  // If CRM API returns 401 Unauthorized, automatically log out and show login page
  useEffect(() => {
    if (crmError && (crmError.toLowerCase().includes('unauthorized') || crmError.includes('401'))) {
      handleAdminLogout();
      setLoginError('Admin session expired or access unauthorized. Please sign in as admin.');
    }
  }, [crmError, handleAdminLogout]);

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
  const [loadingFullHistory, setLoadingFullHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState<ChatStatus | 'all'>('all'); // Chat status filter
  const [leadStageFilter, setLeadStageFilter] = useState<LeadStageFilter>('all'); // Lead stage filter (New/Interested/Connected)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last_week'>('all'); // Date filter
  const [archivedPhones, setArchivedPhones] = useState<Set<string>>(new Set()); // Archived conversations
  const [showArchived, setShowArchived] = useState(false); // Toggle archived view
  const [composerText, setComposerText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; fileName?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // Added for sidebar toggle
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false); // Added for attachment popup
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false); // Dropdown for header
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // Lightbox for media zoom
  const [avatarZoom, setAvatarZoom] = useState(false); // Avatar zoom modal
  const [needsMetaSetup, setNeedsMetaSetup] = useState(false); // Tenant Meta WhatsApp setup requirement

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
  const [isAi9ModalOpen, setIsAi9ModalOpen] = useState(false);
  const [ai9Data, setAi9Data] = useState<{q: string, a: string}[]>([{ q: '', a: '' }]);
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
    templateId?: string;
    templateName?: string;
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

  // Load quick replies from Bunny DB
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/quick-replies', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.replies?.length) {
          setQuickReplies(
            json.data.replies.map((r: any) => ({ id: r.id, text: r.content, title: r.title }))
          );
        }
      })
      .catch(() => {});
  }, [token]);

  const addQuickReply = async (text: string, andUseInMessage = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const tempId = `qr_${Date.now()}`;
    setQuickReplies((prev) => [{ id: tempId, text: trimmed }, ...prev]);
    if (andUseInMessage) {
      setComposerText((prev) => (prev ? `${prev} ${trimmed}` : trimmed));
    }
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/quick-replies', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const json = await res.json();
      const serverId = json?.data?.id || json?.id;
      if (serverId) {
        setQuickReplies((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, id: serverId } : item))
        );
      }
    } catch (err) {
      console.warn('Failed to persist quick reply to server:', err);
    }
  };

  const deleteQuickReply = async (id: string) => {
    setQuickReplies((prev) => prev.filter((p) => p.id !== id));
    if (!token) return;
    try {
      await fetch(`/api/admin/crm/quick-replies?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

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
  const pendingNameRef = useRef<string | null>(null);
  // Mirrors `messages` for use inside loadAllOldMessages' tight loop, where
  // reading the closed-over `messages` state directly would be stale between
  // iterations (see loadAllOldMessages below).
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
        pendingNameRef.current = url.searchParams.get('name')?.trim() || null;
        // Clean the URL so it doesn't persist on refresh
        url.searchParams.delete('phone');
        url.searchParams.delete('name');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

    // Auto-refresh every 30 seconds. Don't recreate the interval on every keystroke.
    const timer = setInterval(() => {
      loadConversations(searchQuery, true);
      fetchMonthlyExpenses();
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
  const fetchMonthlyExpenses = useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  useEffect(() => {
    fetchMonthlyExpenses();
  }, [fetchMonthlyExpenses]);

  // Search-triggered reload (debounced)
  useEffect(() => {
    if (!token) return;
    if (!searchQuery.trim()) return;
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
      loadMessages(c.phoneNumber || c.leadId || c._id, true);
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

    // Prefer sentAt (actual WhatsApp timestamp) over createdAt (server processing time)
    const inbound = messages
      .filter((m) => m.direction === 'inbound')
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.sentAt || a.createdAt).getTime();
        const tb = new Date(b.sentAt || b.createdAt).getTime();
        return tb - ta;
      });

    const lastInbound = inbound[0];
    if (lastInbound) {
      const ts = new Date(lastInbound.sentAt || lastInbound.createdAt).getTime();
      if (Number.isFinite(ts)) {
        setWindowAnchorMs((prev) => (prev === ts ? prev : ts));
        return;
      }
    }

    // Fallback: use conversation-level lastInboundAt to avoid showing
    // null/stale timer while messages are still loading
    if (selected.lastInboundAt) {
      const ts = new Date(selected.lastInboundAt).getTime();
      if (Number.isFinite(ts)) {
        setWindowAnchorMs((prev) => (prev === ts ? prev : ts));
        return;
      }
    }

    setWindowAnchorMs(null);
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
      if (data?.needsSetup) {
        setNeedsMetaSetup(true);
      } else if (data?.conversations && data.conversations.length > 0) {
        setNeedsMetaSetup(false);
      }
      if (data?.conversations) {
        const currentSelectedPhone = selectedRef.current?.phoneNumber;
        const mapped = currentSelectedPhone
          ? (data.conversations as ConversationRow[]).map(c => 
              (c.phoneNumber === currentSelectedPhone || (c.phoneNumber && currentSelectedPhone && c.phoneNumber.replace(/\D/g, '').endsWith(currentSelectedPhone.replace(/\D/g, '').slice(-10))))
                ? { ...c, unreadCount: 0 }
                : c
            )
          : data.conversations;
        setConversations(mapped);
        if (typeof data.total === 'number') setConversationsTotal(data.total);

        // Auto-select conversation from ?phone= query param
        if (pendingPhoneRef.current) {
          const target = pendingPhoneRef.current;
          const nameHint = pendingNameRef.current;
          pendingPhoneRef.current = null; // Consume once
          pendingNameRef.current = null;
          const match = (data.conversations as ConversationRow[]).find(c => {
            const p = (c.phoneNumber || '').replace(/\D/g, '');
            return p === target || p.endsWith(target.slice(-10));
          });
          if (match) {
            handleSelectConversation(match);
          } else {
            // No existing conversation for this number — add a placeholder so
            // it appears in the sidebar and can be messaged directly.
            const placeholder: ConversationRow = {
              _id: '',
              leadId: '',
              name: nameHint || target,
              hasLead: !!nameHint,
              phoneNumber: target,
              unreadCount: 0,
              labels: [],
            };
            setConversations(prev => prev.some(c => (c.phoneNumber || '').replace(/\D/g, '') === target)
              ? prev
              : [placeholder, ...prev]);
            handleSelectConversation(placeholder);
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
      // Determine if id is a leadId or phoneNumber
      // A phone number is at least 10 digits long. A lead ID can be a 24-char hex or a short custom ID (e.g. 6 digits)
      const digitsOnly = String(id || '').replace(/\D/g, '');
      const isPhoneNumber = digitsOnly.length >= 10;
      const params: any = isPhoneNumber ? { phoneNumber: digitsOnly } : { leadId: id };
      params.provider = providerScope;
      const reqConvId = selectedRef.current?._id;
      
      const data = await crmFetch(`/api/admin/crm/messages`, { 
        params,
        silent, // Pass silent flag to crmFetch
      });
      
      // Prevent race conditions: check if user switched chats while fetching
      if (!silent && reqConvId && selectedRef.current?._id !== reqConvId) return;

      if (data?.messages) {
        // Reverse needed so oldest is at top (standard chat view)
        const fresh = [...data.messages].reverse();

        if (silent) {
          // The 10s poll only ever asks for the server's most-recent window.
          // Overwriting state with just that would silently discard any
          // older history the user had already paged back through via
          // "Show Old Chat" — so merge instead: keep everything we'd loaded that's older than this
          // fresh window, and refresh the recent window itself (picks up
          // new messages + status ticks on recent ones).
          setMessages((prev) => {
            const earliestFreshTs = fresh.length ? new Date((fresh[0] as any).sentAt || (fresh[0] as any).createdAt).getTime() : Infinity;
            const freshIds = new Set(fresh.map((m: any) => m._id));
            const olderKept = prev.filter((m: any) =>
              !freshIds.has(m._id) && new Date(m.sentAt || m.createdAt).getTime() < earliestFreshTs
            );
            return [...olderKept, ...fresh];
          });
          const prevLast = messagesRef.current[messagesRef.current.length - 1];
          const hasNew = fresh.length > 0 && fresh[fresh.length - 1]._id !== prevLast?._id;
          if (hasNew) setTimeout(() => scrollToBottom(), 100);
        } else {
          const hasNew = fresh.length !== messages.length ||
            (fresh.length > 0 && fresh[fresh.length - 1]._id !== messages[messages.length - 1]?._id);
          setMessages(fresh);
          if (hasNew) setTimeout(() => scrollToBottom(), 100);
        }

        // Auto-mark thread as read in DB if it has unread messages
        const sel = selectedRef.current;
        if (sel?.phoneNumber && (sel.unreadCount || 0) > 0) {
          markThreadAsRead(sel.leadId, sel.phoneNumber, true);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Fetches ONE page of messages strictly older than the oldest one
  // currently loaded — merges hot Mongo data with the Bunny archive
  // server-side (see /api/admin/crm/messages) once Mongo's ~1 day hot
  // window is exhausted, so this can reach back to the full 1-year
  // retention boundary. Reads selected/messages via refs (not closed-over
  // state) so it's safe to call repeatedly in the loadAllOldMessages loop
  // below without waiting for a re-render between calls.
  // Returns true if a full page came back (there is likely more history).
  const fetchOlderPage = async (): Promise<boolean> => {
    const c = selectedRef.current;
    if (!c) return false;
    const phone = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
    const id = phone.length >= 10 ? phone : (c.leadId || c._id);
    if (!id) return false;
    const oldest = messagesRef.current[0];
    if (!oldest) return false;

    const params: any = phone.length >= 10 ? { phoneNumber: phone } : { leadId: id };
    params.provider = providerScope;
    params.before = new Date((oldest as any).sentAt || (oldest as any).createdAt).toISOString();
    params.limit = 20;

    const data = await crmFetch(`/api/admin/crm/messages`, { params, silent: true });
    const older = Array.isArray(data?.messages) ? [...data.messages].reverse() : [];
    if (older.length === 0) {
      setHasMoreHistory(false);
      return false;
    }
    setMessages((prev) => [...older, ...prev]);
    setMessageLimit((prev) => prev + older.length);
    const more = older.length >= 20;
    if (!more) setHasMoreHistory(false);
    return more;
  };

  // "Show Old Chat" — the single history control. First reveals any messages
  // already fetched but hidden behind messageLimit, then keeps fetching
  // further back (up to the ~1 year retention boundary — see RETENTION_DAYS
  // in lib/metaWhatsappArchive.ts) until nothing older is left.
  const loadAllOldMessages = async () => {
    if (!selected || loadingFullHistory) return;
    setLoadingFullHistory(true);
    try {
      // Reveal what's already loaded but collapsed behind the reveal window.
      if (messagesRef.current.length > messageLimit) {
        setMessageLimit(messagesRef.current.length);
      }
      let more = hasMoreHistory;
      let guard = 0;
      const MAX_PAGES = 100; // 100 * 20 = up to 2000 messages — generous safety cap
      while (more && guard < MAX_PAGES) {
        more = await fetchOlderPage();
        guard++;
      }
      // Each fetchOlderPage() call already grows messageLimit by exactly
      // the number of messages it merged in, so the whole loaded history
      // is revealed by the time this loop ends — no extra step needed.
    } catch (err) {
      console.error('Failed to load full chat history:', err);
    } finally {
      setLoadingFullHistory(false);
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
        type: uploadType,
        fileName: file.name,
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
    selectedRef.current = conv;
    setMessageLimit(5);
    setHasMoreHistory(true);
    setMessages([]); // Clear previous chat messages immediately to prevent visual mixing
    loadMessages(conv.phoneNumber || conv.leadId || conv._id);
    
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

    // Mark as read - optimistically update local state immediately
    if (conv.phoneNumber) {
      setConversations(prev => prev.map(c => 
        (c.phoneNumber === conv.phoneNumber || (c.phoneNumber && conv.phoneNumber && c.phoneNumber.replace(/\D/g, '').endsWith(conv.phoneNumber.replace(/\D/g, '').slice(-10))))
          ? { ...c, unreadCount: 0 } 
          : c
      ));
      setSelected(prev => prev ? { ...prev, unreadCount: 0 } : null);
      markThreadAsRead(conv.leadId, conv.phoneNumber, true);
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

  const markThreadAsRead = async (leadId?: string, phoneNumber?: string, skipRefetch = false) => {
    if (!leadId && !phoneNumber) return;
    try {
      await crmFetch('/api/admin/crm/messages', {
        method: 'PUT',
        body: { leadId, phoneNumber, action: 'markThreadAsRead' }
      });
      // Only refresh conversations if not skipped (optimistic update already happened)
      if (!skipRefetch) {
        loadConversations(searchQuery);
      }
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
    const textToSend = composerText.trim() || (attachedMedia ? `[${attachedMedia.type || 'media'}]` : '');
    const mediaToSend = attachedMedia;
    if (!textToSend && !mediaToSend) return;

    const leadId = selected.leadId;
    const phoneNumber = selected.phoneNumber || selected._id;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. INSTANT OPTIMISTIC UI: Clear inputs immediately (<5ms)
    setComposerText('');
    setAttachedMedia(null);

    // 2. Append optimistic message to UI immediately
    const optimisticMessage: any = {
      _id: tempId,
      leadId: leadId ? String(leadId) : undefined,
      phoneNumber,
      messageContent: textToSend,
      direction: 'outbound',
      status: 'sending',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      senderDisplayName: 'Swar Yoga',
      ...(mediaToSend?.url && {
        media: {
          url: mediaToSend.url,
          kind: mediaToSend.type || 'image',
        },
        messageType: 'media',
      }),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // 3. Fire API in background without blocking composer
    setSending(true);
    try {
      const sendPromise = crmFetch(`/api/admin/crm/whatsapp/send`, {
        method: 'POST',
        body: {
          leadId,
          phoneNumber,
          messageContent: textToSend,
          media: mediaToSend ? {
            kind: mediaToSend.type,
            url: mediaToSend.url,
            fileName: mediaToSend.fileName,
          } : undefined,
          provider: providerScope,
        },
      });

      // Concurrently update chat status to closed if leadId exists
      if (leadId) {
        crmFetch(`/api/admin/crm/leads/${leadId}/chat-status`, {
          method: 'PATCH',
          body: { chatStatus: 'closed' }
        }).catch(() => {});
        setSelected((prev) => (prev ? { ...prev, chatStatus: 'closed' } : null));
        setConversations((prev) => prev.map((c) => (c.leadId === leadId ? { ...c, chatStatus: 'closed' } : c)));
      }

      const sendRes = await sendPromise;

      const isSuccess = Boolean(
        sendRes && (
          sendRes.success === true ||
          sendRes.status === 'sent' ||
          sendRes.messageId ||
          sendRes.data?.success === true ||
          sendRes.data?.status === 'sent' ||
          sendRes.data?.messageId
        )
      );

      if (isSuccess) {
        const finalMessageId = sendRes.data?.messageId || sendRes.messageId || tempId;
        const finalWaMessageId = sendRes.data?.waMessageId || sendRes.waMessageId;
        // Upgrade optimistic message to 'sent'
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? {
                  ...m,
                  _id: finalMessageId,
                  status: 'sent',
                  waMessageId: finalWaMessageId,
                }
              : m
          )
        );
      } else {
        throw new Error(sendRes?.error || sendRes?.data?.error || (typeof sendRes === 'string' ? sendRes : 'Message send returned error'));
      }
    } catch (err: any) {
      console.error('Failed to deliver message:', err);
      const reason = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Failed to send message');
      // Mark as failed in UI with error message
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId
            ? { ...m, status: 'failed', errorMessage: reason }
            : m
        )
      );
      if (
        reason.includes('24-Hour') || 
        reason.includes('24 hours') || 
        reason.includes('template') || 
        reason.includes('Re-engagement') ||
        reason.includes('131047')
      ) {
        setActionModal({ type: 'template' });
      }
    } finally {
      setSending(false);
    }
  };

  // ================================================================
  // MEDIA DOWNLOAD / FORWARD HANDLERS
  // ================================================================
  const handleMediaDownload = async (mediaUrl: string, fileName?: string) => {
    try {
      const downloadUrl = (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) && token
        ? `/api/admin/crm/media/proxy?url=${encodeURIComponent(mediaUrl)}&token=${encodeURIComponent(token)}`
        : mediaUrl;
      const res = await fetch(downloadUrl);
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
      // Fallback: trigger direct link download
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = fileName || `download-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
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
    
    // Optimistically update local state immediately
    const toMarkIds = new Set(toMark.map(c => c.phoneNumber));
    setConversations(prev => prev.map(c => 
      toMarkIds.has(c.phoneNumber) ? { ...c, unreadCount: 0 } : c
    ));
    
    try {
      // Batch all mark-read calls
      await Promise.all(
        toMark.map((c) =>
          crmFetch('/api/admin/crm/messages', {
            method: 'PUT',
            body: { leadId: c.leadId, phoneNumber: c.phoneNumber, action: 'markThreadAsRead' },
          })
        )
      );
      bulkClear();
    } catch (err) {
      console.error('Bulk mark read failed:', err);
      // On error, refetch to restore correct state
      loadConversations(searchQuery);
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

  // Export the checked rows as a CSV file (checked rows only, not the whole filtered list).
  const handleDownloadSelected = () => {
    const rows = filteredConversations.filter((c) => bulkSelected[c._id]);
    if (rows.length === 0) return;

    const headers = ['Lead ID', 'Name', 'Phone', 'Lead Stage', 'Chat Status', 'Assigned To'];
    const csvRows = rows.map((c) => {
      const stage = mapLeadStage(c.status).label;
      const chatStatus = getChatStatusInfo(c.lastMessageAt, c.chatStatus, c.lastInboundAt, c.lastDirection).label;
      const assignedName = adminUsers.find((u) => u.userId === c.assignedToUserId)?.name || 'Unassigned';
      return [
        c.leadNumber ? String(c.leadNumber).padStart(6, '0') : '',
        c.name || '',
        c.phoneNumber || '',
        stage,
        chatStatus,
        assignedName,
      ];
    });

    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent = [headers, ...csvRows].map((r) => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      // Clear notes after saving so they don't get duplicated on next save
      setSidebarData((prev: any) => ({ ...prev, notes: '', followUpDate: '' }));
      loadConversations(searchQuery);

      // Show success toast
      const toast = document.createElement('div');
      toast.textContent = '✅ Changes saved!';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1E7F43;color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.18);animation:fadeIn .2s ease';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (err) {
      console.error('Failed to save sidebar data:', err);
      alert('Failed to save changes. Please try again.');
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
      
      const isTemplate = !!actionModal?.templateId;
      
      const body: any = {
        name: mode === 'schedule' 
          ? (isTemplate ? 'Scheduled Template' : 'Scheduled Message')
          : mode === 'delay' 
            ? 'Delayed Message' 
            : 'Recurring Message',
        messageType: isTemplate ? 'template' : 'text',
        messageContent: text,
        templateId: actionModal?.templateId,
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

    // Filter by lead stage (New / Interested / Connected)
    if (leadStageFilter !== 'all') {
      result = result.filter(c => mapLeadStage(c.status).key === leadStageFilter);
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
  }, [conversations, searchQuery, chatStatusFilter, leadStageFilter, dateFilter, archivedPhones, showArchived, showBlocked]);

  // Group filtered conversations by date sections
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const groups: { label: string; conversations: ConversationRow[] }[] = [];
    const buckets: Record<string, ConversationRow[]> = {};
    // tier: 3=Today, 2=Yesterday, 1=specific date (sorted by its own timestamp), 0=Older.
    // Conversations are sorted unread-first above, so a date group's first
    // encountered position no longer reflects chronological order — sort
    // groups by tier/timestamp explicitly so "Today" always comes first.
    const tiers: Record<string, { tier: number; ts: number }> = {};

    for (const conv of filteredConversations) {
      const ts = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
      let label: string;
      let tier: number;
      if (ts >= todayStart) {
        label = 'Today';
        tier = 3;
      } else if (ts >= yesterdayStart) {
        label = 'Yesterday';
        tier = 2;
      } else if (ts > 0) {
        // Format as "Jan 30" or "Dec 15"
        label = new Date(conv.lastMessageAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        tier = 1;
      } else {
        label = 'Older';
        tier = 0;
      }
      if (!buckets[label]) {
        buckets[label] = [];
        tiers[label] = { tier, ts };
      }
      buckets[label].push(conv);
    }

    const order = Object.keys(buckets).sort((a, b) => {
      if (tiers[b].tier !== tiers[a].tier) return tiers[b].tier - tiers[a].tier;
      return tiers[b].ts - tiers[a].ts;
    });

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
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `Fix failed (${res.status})`);
      }
      if (data.result) {
        setComposerText(data.result);
      }
    } catch (err) {
      console.error('AI Fix failed:', err);
      alert(err instanceof Error ? err.message : 'AI Fix failed — please try again.');
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
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `AI reply failed (${res.status})`);
      }
      if (data.result) {
        setComposerText(data.result);
      }
    } catch (err) {
      console.error('AI Reply failed:', err);
      alert(err instanceof Error ? err.message : 'AI reply failed — please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-[#072414] to-slate-950 flex items-center justify-center p-4 select-none overflow-y-auto">
        {/* Top Back Navigation to return to public website */}
        <div className="absolute top-4 left-4 z-10">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full shadow-sm border border-white/15 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to Website</span>
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-9 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden my-auto">
          {/* Top decorative accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-[#166235]" />

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-[#166235] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-50">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Meta WhatsApp CRM</h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mt-2">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Admin Access Only</span>
            </div>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Sign in with authorized administrator credentials to manage Meta WhatsApp chats and leads.
            </p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginLoading(true);
              setLoginError('');
              try {
                const res = await fetch('/api/mobile-chat/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: loginUserId, password: loginPassword })
                });
                const data = await res.json();
                if (data.success && data.token) {
                  if (!isValidAdminToken(data.token)) {
                    setLoginError('Access denied: this account does not have admin privileges.');
                    setLoginLoading(false);
                    return;
                  }
                  localStorage.setItem('adminToken', data.token);
                  localStorage.setItem('admin_token', data.token);
                  localStorage.setItem('crm_token', data.token);
                  if (data.user) {
                    localStorage.setItem('admin_user', JSON.stringify(data.user));
                    localStorage.setItem('adminUser', data.user.userId || data.user.name || '');
                  }
                  document.cookie = `adminToken=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
                  document.cookie = `admin_token=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
                  document.cookie = `crm_token=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
                  setToken(data.token);
                } else {
                  setLoginError(data.error || 'Login failed. Invalid admin User ID or Password.');
                }
              } catch (err) {
                setLoginError('Network connection error. Please try again.');
              }
              setLoginLoading(false);
            }} 
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Admin User ID / Mobile</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. 9779006820</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  value={loginUserId} 
                  onChange={e => setLoginUserId(e.target.value)} 
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 font-medium" 
                  placeholder="Enter User ID or Mobile" 
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm text-slate-900 font-medium" 
                  placeholder="••••••••" 
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loginLoading} 
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-[#166235] hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In as Admin</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-end encrypted Swar Yoga Admin Portal</span>
          </div>
        </div>
      </div>
    );
  }

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
      <header className={`px-3.5 py-2 items-center shrink-0 z-20 shadow-sm ${selected ? 'hidden md:flex' : 'flex'}`} style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 40%, #16a34a 100%)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        {/* Left: Logo + Platform Tabs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            className="rounded-xl bg-white/20 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all hover:scale-105 shadow-md shrink-0 overflow-hidden flex items-center justify-center" 
            style={{ width: '32px', height: '32px', minWidth: '32px', maxWidth: '32px', minHeight: '32px', maxHeight: '32px', padding: '2px' }}
            onClick={() => router.push('/admin/crm')}
          >
            <div 
              className="rounded-[10px] bg-white flex items-center justify-center overflow-hidden"
              style={{ width: '28px', height: '28px', minWidth: '28px', maxWidth: '28px' }}
            >
              <img 
                src="/logo.png" 
                alt="Swar Yoga" 
                style={{ width: '20px', height: '20px', maxWidth: '20px', maxHeight: '20px', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
          <nav className="flex gap-0.5 bg-black/15 backdrop-blur-md border border-white/15 rounded-xl p-0.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white text-emerald-800 shadow-sm transition-all" title="WhatsApp">
              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">WhatsApp</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all duration-150" title="Messenger" onClick={() => router.push('/admin/crm/messenger')}>
              <MessengerIcon className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden lg:inline">Messenger</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all duration-150" title="Instagram" onClick={() => router.push('/admin/crm/instagram')}>
              <InstagramIcon className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden lg:inline">Instagram</span>
            </button>
          </nav>

          <button
            onClick={modal.open}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 hover:shadow-md transition-all shadow-sm active:scale-95 shrink-0"
            title="Start New Chat / Add Lead"
            type="button"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Center: Nav Tabs */}
        <div className="flex-1 flex justify-center px-2">
          <nav className="flex gap-0.5 bg-black/15 backdrop-blur-md border border-white/15 rounded-xl p-0.5 max-w-full overflow-x-auto no-scrollbar">
            {['Leads', 'Followup', 'Sales', 'Messages', 'Analytics', 'Home'].map((tab) => (
              <button 
                key={tab}
                onClick={() => goToTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/15'
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all duration-150 ${
                  toolsDropdownOpen 
                    ? 'bg-white text-emerald-800 border-white shadow-md' 
                    : 'bg-black/15 text-white/90 border-white/20 hover:bg-white/20 hover:text-white'
                }`}
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
             >
                <Wrench className="w-3 h-3 text-emerald-300" />
                <span className="hidden lg:inline uppercase tracking-wider">Tools</span>
                <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
             </button>

             {toolsDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl z-50 overflow-hidden p-1.5 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                   {[
                      { label: 'Dashboard', icon: BarChart3, href: '/admin/crm/meta-dashboard', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                      { label: 'Chatbots', icon: Bot, href: '/admin/crm/chatbots', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Templates', icon: FileText, href: '/admin/crm/templates', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Broadcasts', icon: Megaphone, href: '/admin/crm/broadcasts', color: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: 'Automation', icon: Zap, href: '/admin/crm/automation', color: 'text-purple-600', bg: 'bg-purple-50' },
                   ].map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <button 
                          key={tool.label}
                          onClick={() => {
                            setToolsDropdownOpen(false);
                            router.push(tool.href);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50/70 rounded-xl transition-all group text-left"
                        >
                          <div className={`h-7 w-7 rounded-lg ${tool.bg} flex items-center justify-center shrink-0`}>
                             <ToolIcon className={`w-3.5 h-3.5 ${tool.color}`} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">{tool.label}</span>
                        </button>
                      );
                   })}
                </div>
             )}
          </div>

          {/* Monthly Expense Widget - hidden on small mobile to prevent squishing */}
          {monthlyExpenseSummary && (
            <div 
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-sm border border-white/30 cursor-pointer hover:bg-white shadow-sm transition-all"
              onClick={() => router.push('/admin/crm/whatsapp-analytics')}
              title="Click to view full analytics"
            >
              <div className="text-center">
                <div className="text-[7.5px] font-black text-rose-500 uppercase tracking-wider">Month</div>
                <div className="text-[12px] font-black text-rose-700 leading-tight">
                  ₹{monthlyExpenseSummary.total > 0 && monthlyExpenseSummary.total < 10
                    ? monthlyExpenseSummary.total.toFixed(2)
                    : Math.round(monthlyExpenseSummary.total).toLocaleString()}
                </div>
              </div>
              <div className="h-5 w-px bg-slate-200"></div>
              <div className="flex flex-col text-[8px] leading-tight">
                <div className="flex gap-1 items-center">
                  <span className="text-slate-400 font-medium">Msgs:</span>
                  <span className="font-bold text-slate-700">{monthlyExpenseSummary.messagesSent.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="text-slate-400 font-medium">Mktg:</span>
                  <span className="font-bold text-rose-600">
                    ₹{monthlyExpenseSummary.marketing > 0 && monthlyExpenseSummary.marketing < 10
                      ? monthlyExpenseSummary.marketing.toFixed(2)
                      : Math.round(monthlyExpenseSummary.marketing).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all duration-150 ${
              isBotMode 
                ? 'bg-white text-violet-700 border-white shadow-md ring-2 ring-violet-300/50' 
                : 'bg-black/15 text-white/80 border-white/20 hover:bg-white/20 hover:text-white'
            }`}
            onClick={() => setIsBotMode(!isBotMode)}
            title="Toggle AI Auto-Reply"
          >
             <Bot className={`w-3.5 h-3.5 ${isBotMode ? 'animate-pulse text-violet-600' : 'text-emerald-300'}`} />
             <span className="hidden xl:inline uppercase tracking-wider">{isBotMode ? 'AI On' : 'AI Off'}</span>
          </button>

          <button className={`hidden sm:flex p-2 rounded-lg transition-all duration-150 ${showDiagnostics ? 'text-amber-300 bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/15'}`} title="Diagnostics" onClick={() => setShowDiagnostics(!showDiagnostics)}>
            <Wrench className="w-3.5 h-3.5" />
          </button>
          <button className="hidden sm:flex p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-150" title="Settings" onClick={() => router.push('/admin/crm/chatbots')}>
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button className="hidden md:flex p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-150" title="Automation" onClick={() => router.push('/admin/crm/automation')}>
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button className="hidden md:flex p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-150" title="Templates" onClick={() => router.push('/admin/crm/templates')}>
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button className="hidden md:flex p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-150" title="Broadcast" onClick={() => router.push('/admin/crm/broadcast')}>
            <Megaphone className="w-3.5 h-3.5" />
          </button>

          {/* Logout button */}
          <button
            onClick={handleAdminLogout}
            className="px-2.5 py-1.5 text-white/95 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold border border-white/20 bg-black/15 shrink-0 cursor-pointer"
            title="Sign out of Meta WhatsApp Admin"
          >
            <LogOut className="w-3.5 h-3.5 text-red-200" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-[#F8FAFC]">

        {/* LEFT CHAT LIST */}
        <aside className={`w-full md:w-[27rem] border-r border-slate-200/80 flex-col overflow-hidden ${selected ? 'hidden md:flex' : 'flex'} bg-slate-50/60`}>

          <div className="px-3.5 py-3 border-b border-slate-200/80 flex gap-2 items-center shrink-0 bg-white/90 backdrop-blur-md">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
              <input 
                className="w-full border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/70 hover:bg-white focus:bg-white placeholder:text-slate-400 font-medium shadow-xs" 
                placeholder="Search name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-xs transition-all duration-150 active:scale-95 shrink-0"
              title="Meta WhatsApp Setup & Settings"
              onClick={() => { setSelected(null); setNeedsMetaSetup(true); }}
              type="button"
            >
              <Settings className="w-4 h-4" />
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

            {/* Lead Stage Dropdown */}
            <select
              value={leadStageFilter}
              onChange={(e) => setLeadStageFilter(e.target.value as LeadStageFilter)}
              className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E7F43] focus:border-[#1E7F43] cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="new_lead">New</option>
              <option value="interested">Interested</option>
              <option value="negotiation">Connected</option>
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
                    else if (v === 'download') handleDownloadSelected();
                  }}
                  disabled={bulkActionLoading}
                >
                  <option value="">{selectedIds.length} sel ▸</option>
                  <option value="read">✓ Mark read</option>
                  <option value="assign">👤 Assign</option>
                  <option value="labels">🏷 Labels</option>
                  <option value="archive">{showArchived ? '↩ Unarchive' : '📦 Archive'}</option>
                  <option value="block">{showBlocked ? '🔓 Unblock' : '🚫 Block'}</option>
                  <option value="download">⬇ Download list</option>
                </select>
                <ChevronDown className="w-2.5 h-2.5 text-emerald-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                          <Phone className="w-2.5 h-2.5" />
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
              <div className="p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Loading chats…</span>
              </div>
            ) : crmError && conversations.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <div className="text-sm font-bold text-slate-800">Unable to load conversations</div>
                <div className="text-xs text-rose-600 mt-1 max-w-[260px]">{crmError}</div>
                <button
                  type="button"
                  onClick={() => loadConversations('', false)}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : needsMetaSetup ? (
              <div className="p-5 m-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <WhatsAppIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-sm font-bold text-emerald-950">Setup Required</div>
                <div className="text-xs text-emerald-700 mt-1 mb-4 leading-relaxed">
                  Connect your official Meta WhatsApp Business account to send & receive messages.
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setNeedsMetaSetup(true); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Configure WhatsApp
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  {showBlocked ? <Ban className="w-6 h-6" /> : showArchived ? <Archive className="w-6 h-6" /> : dateFilter !== 'all' ? <Calendar className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <div className="text-sm font-bold text-slate-500">
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
                <div className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  {showBlocked ? 'Blocked users will appear here when blocked.' : showArchived ? 'Archived conversations will appear here.' : 'Try adjusting your search or filters.'}
                </div>
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label} className="mb-2">
                  {/* Date Section Header */}
                  <div className="sticky top-0 z-10 px-4 py-1.5 flex items-center gap-2 bg-slate-100/90 backdrop-blur-md border-y border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="text-[10.5px] font-black text-slate-600 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400">({group.conversations.length})</span>
                  </div>
                  <div className="space-y-0.5 pt-1">
                  {group.conversations.map((conv) => {
                    const isUnread = (conv.unreadCount || 0) > 0;
                    return (
                    <div 
                      key={conv._id} 
                      onClick={() => handleSelectConversation(conv)}
                      className={`mx-2 my-1 px-3 py-2.5 rounded-2xl flex gap-2.5 items-center cursor-pointer transition-all duration-150 group relative border ${
                        selected?._id === conv._id
                          ? 'bg-emerald-50/90 border-emerald-400/90 shadow-sm ring-1 ring-emerald-500/20'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50/90 hover:border-emerald-300/80 shadow-xs'
                      }`}
                    >
                      {/* Bulk Select Checkbox */}
                      <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                          checked={!!bulkSelected[conv._id]}
                          onChange={(e) => toggleBulk(conv._id, e.target.checked)}
                        />
                      </div>

                      {/* Contact Avatar Circle */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(conv.name || conv.phoneNumber)} flex items-center justify-center text-white font-bold text-xs shadow-xs`}>
                          {getInitials(conv.name, conv.phoneNumber)}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white"></span>
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Row 1: Name / Phone + Channel Icon + Timestamp */}
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="min-w-0 flex-1 pr-1.5">
                            {conv.name && conv.name !== 'Unknown User' && !conv.name.match(/^\+?\d+$/) ? (
                              <div>
                                <div className="font-bold text-slate-900 truncate text-[13px] leading-tight">
                                  {conv.name}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500 truncate leading-tight mt-0.5">
                                  {formatPhoneDisplay(conv.phoneNumber)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-slate-800 truncate text-[12.5px] tracking-wide leading-tight">
                                {formatPhoneDisplay(conv.phoneNumber)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-semibold text-slate-400">
                              {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : ''}
                            </span>
                            {/* Quick action buttons on hover */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleArchive(conv.phoneNumber); }}
                              className={`p-1 rounded-md transition-all ${
                                showArchived 
                                  ? 'text-amber-600 bg-amber-50'
                                  : 'text-slate-300 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100'
                              }`}
                              title={showArchived ? 'Unarchive' : 'Archive'}
                            >
                              {showArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleBlockSingle(conv.leadId, !conv.isBlocked, 'manual'); }}
                              className={`p-1 rounded-md transition-all ${
                                conv.isBlocked
                                  ? 'text-emerald-600 bg-emerald-50'
                                  : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100'
                              }`}
                              title={conv.isBlocked ? 'Unblock' : 'Block'}
                            >
                              {conv.isBlocked ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Secondary info (Phone if name exists) & Last message preview */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-[11.5px] text-slate-500 truncate flex items-center gap-1 min-w-0">
                            {conv.lastDirection === 'outbound' && (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-500 shrink-0 inline" />
                            )}
                            <span className="truncate">
                              {conv.lastMessageContent || (conv.name ? formatPhoneDisplay(conv.phoneNumber) : 'No messages yet')}
                            </span>
                          </div>
                          {conv.unreadCount ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black h-4.5 min-w-[18px] px-1.5 rounded-full flex items-center justify-center shadow-xs shrink-0">
                              {conv.unreadCount}
                            </span>
                          ) : null}
                        </div>

                        {/* Row 3: Modern Clean Pills (No ugly N/A boxes) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {conv.leadNumber ? (
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200" title="Lead ID">
                              #{String(conv.leadNumber).padStart(5, '0')}
                            </span>
                          ) : null}

                          <ChatStatusBadge
                            lastMessageAt={conv.lastMessageAt}
                            manualStatus={conv.chatStatus}
                            lastInboundAt={conv.lastInboundAt}
                            lastDirection={conv.lastDirection}
                            size="xs"
                            interactive={true}
                            onStatusChange={(newStatus) => handleChatStatusChange(newStatus, conv.leadId)}
                          />

                          {(() => {
                            const stage = mapLeadStage(conv.status);
                            return (
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${stage.colorClass}`}>
                                {stage.label}
                              </span>
                            );
                          })()}

                          {conv.assignedToUserId ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[80px]" title={adminUsers.find(u => u.userId === conv.assignedToUserId)?.name || 'Assigned'}>
                              👤 {adminUsers.find(u => u.userId === conv.assignedToUserId)?.name?.split(' ')[0] || 'Assigned'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

    {/* CHAT AREA */}
    <main className={`flex-1 flex-col overflow-hidden relative z-10 ${selected ? 'flex' : 'hidden md:flex'}`} style={{ background: 'linear-gradient(180deg, #FAFCFB 0%, #F5F8F6 100%)', boxShadow: '0 8px 32px rgba(30,127,67,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>

          {selected ? (
            <>
              <div className="px-3 py-2 flex gap-2 items-center sticky top-0 z-30 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
                <button className="md:hidden p-1.5 -ml-1 text-slate-700 hover:text-emerald-700 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setSelected(null)}>
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="flex items-center gap-2.5 mr-auto min-w-0">
                   <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(selected.name || selected.phoneNumber)} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 cursor-pointer hover:scale-105 transition-transform`} onClick={() => setAvatarZoom(true)} title="Click to view">
                      {getInitials(selected.name, selected.phoneNumber)}
                   </div>
                   <div className="min-w-0">
                     <div className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">
                       {selected.name && selected.name !== 'Unknown User' ? selected.name : formatPhoneDisplay(selected.phoneNumber)}
                     </div>
                     <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                       <span className="truncate">{formatPhoneDisplay(selected.phoneNumber)}</span>
                       <button
                         type="button"
                         onClick={() => {
                           if (navigator?.clipboard && selected.phoneNumber) {
                             navigator.clipboard.writeText(selected.phoneNumber);
                           }
                         }}
                         className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                         title="Copy phone"
                       >
                         <Copy className="w-2.5 h-2.5" />
                       </button>
                     </div>
                   </div>
                </div>

                {/* Quick Call on Mobile */}
                {selected.phoneNumber && (
                  <a
                    href={`tel:${selected.phoneNumber}`}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors md:hidden shrink-0 border border-slate-200/80"
                    title="Direct Phone Call"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </a>
                )}

                <div className="relative hidden md:block">
                  <button
                    type="button"
                    className={`p-2 rounded-xl border transition-colors ${
                      assignOpen
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border-slate-200/80'
                    }`}
                    title="Assign User"
                    onClick={() => {
                      setAssignOpen((v) => !v);
                      setLabelOpen(false);
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>

                  {assignOpen ? (
                    <div className="absolute top-full mt-1.5 right-0 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 px-2 py-1">
                        Assign to
                      </div>
                      <div className="space-y-0.5">
                        {assignOptions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium transition-colors"
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
                          className="w-full px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-slate-50 text-slate-500 transition-colors border-t border-slate-100 mt-1 pt-1.5"
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

                <div className="relative hidden md:block">
                  <button
                    type="button"
                    className={`p-2 rounded-xl border transition-colors ${
                      labelOpen
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border-slate-200/80'
                    }`}
                    title="Label"
                    onClick={() => {
                      setLabelOpen((v) => !v);
                      setAssignOpen(false);
                    }}
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {labelOpen ? (
                    <div className="absolute top-full mt-1.5 right-0 w-[240px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 px-2 py-1">
                        Labels
                      </div>
                      <div className="flex flex-wrap gap-1 px-1 py-1">
                        {(sidebarData.labels || []).map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
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
                      <div className="mt-1 space-y-0.5">
                        {labelOptions.map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium transition-colors"
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
                          className="w-full px-2.5 py-1.5 text-xs text-left rounded-xl hover:bg-slate-50 text-slate-500 transition-colors border-t border-slate-100 mt-1 pt-1.5"
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
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-colors shrink-0"
                  title="Mark as Read"
                  onClick={() => {
                    if (selected?.phoneNumber) {
                      setConversations(prev => prev.map(c => 
                        (c.phoneNumber === selected.phoneNumber || (c.phoneNumber && selected.phoneNumber && c.phoneNumber.replace(/\D/g, '').endsWith(selected.phoneNumber.replace(/\D/g, '').slice(-10))))
                          ? { ...c, unreadCount: 0 }
                          : c
                      ));
                      setSelected(prev => prev ? { ...prev, unreadCount: 0 } : null);
                      markThreadAsRead(selected.leadId, selected.phoneNumber, false);
                    }
                  }}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                
                <button
                  className={`hidden md:flex p-2 rounded-xl border transition-colors ${showSidebar ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-500 hover:bg-slate-50 border-slate-200/80'}`}
                  title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </button>
              </div>

              {/* Sticky top bar: Chat Stage + 24H Window Timer */}
              <div className="flex items-center justify-between px-4 py-2 shrink-0 z-20 bg-slate-100/70 backdrop-blur-sm border-b border-slate-200/60">
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
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
                      title="Mark as Closed"
                      onClick={() => handleChatStatusChange('closed')}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors"
                      title="Reopen Chat"
                      onClick={() => handleChatStatusChange('new')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* 24h WhatsApp Service Window */}
                {windowRemaining && windowRemaining.diff > 0 ? (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full shadow-2xs">
                  <span className="flex h-1.5 w-1.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {`24H • ${String(windowRemaining.hh).padStart(2, '0')}:${String(windowRemaining.mm).padStart(2, '0')}:${String(windowRemaining.ss).padStart(2, '0')}`}
                  </span>
                </div>
                ) : null}
              </div>

              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3 bg-[#EFEAE2]/60" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
                {loadingMessages ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Loading conversation…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-3xl bg-white shadow-xs flex items-center justify-center text-emerald-600">
                      <MessageSquare className="w-8 h-8 opacity-60" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No messages yet</p>
                    <p className="text-xs text-slate-400">Send a message to start chatting.</p>
                  </div>
                ) : (
                  <>
                    {(messages.length > messageLimit || hasMoreHistory) && (
                      <div className="flex justify-center pb-2 pt-1">
                        <button
                           disabled={loadingFullHistory}
                           onClick={loadAllOldMessages}
                           title="Load earlier messages"
                           className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-slate-600 bg-white/95 hover:bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                        >
                           {loadingFullHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                           <span>{loadingFullHistory ? 'Loading history…' : 'Load earlier messages'}</span>
                        </button>
                      </div>
                    )}
                    {messages.slice(-messageLimit).map((msg) => (
                      <div 
                        key={msg._id} 
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[340px] sm:max-w-[420px] rounded-2xl text-[13.5px] relative group transition-all duration-150 overflow-hidden shadow-xs ${
                          msg.direction === 'outbound'
                            ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-xs border border-emerald-300/40'
                            : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/70'
                        }`}>
                          {/* Media Rendering */}
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
                            // Bridge-download fallback for QR messages without uploaded media
                            const bridgeFallbackUrl = (!mediaUrl && (msg.messageType === 'media' || msg.media?.kind) && (msg as any).waMessageId && (msg as any).provider === 'whatsapp_web_bridge')
                              ? `/api/admin/crm/media/bridge-download?messageId=${encodeURIComponent((msg as any).waMessageId)}&token=${encodeURIComponent(token || '')}`
                              : null;
                            const effectiveMediaUrl = mediaUrl || bridgeFallbackUrl;
                            
                            if (effectiveMediaUrl) {
                              // Determine filename for download
                              const dlName = msg.media?.fileName || (rawMediaUrl ? getFilenameFromUrl(rawMediaUrl) : null) || `media-${Date.now()}`;
                              return (
                                <div className="w-full relative group/media cursor-pointer" onClick={() => { if (mediaKind === 'image' || mediaKind === 'sticker') setLightboxImage(effectiveMediaUrl); }}>
                                  <InlineMediaPreview 
                                    url={effectiveMediaUrl} 
                                    type={mediaKind === 'sticker' ? 'image' : mediaKind}
                                    className="w-full max-h-[200px] object-cover"
                                  />
                                  {/* Download + Forward overlay buttons */}
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity duration-200">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMediaDownload(effectiveMediaUrl, dlName); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-lg backdrop-blur-sm"
                                      title="Download"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setForwardMedia({ url: rawMediaUrl || effectiveMediaUrl, kind: mediaKind, caption: msg.messageContent || undefined }); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white shadow-lg backdrop-blur-sm"
                                      title="Forward"
                                    >
                                      <Share2 className="w-4 h-4" />
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
                                content === '[audio message]' ||
                                /^\[(image|video|document|audio|sticker|media)(\s+message)?\]$/i.test(content.trim()) ||
                                content.startsWith('🖼')) {
                              return null;
                            }
                            
                            if (content === '[unsupported message]') {
                              return <span className={`italic opacity-60 text-[13px] ${msg.direction === 'inbound' ? 'text-white/80' : 'text-slate-500'}`}>📎 Unsupported message type</span>;
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
                                    <a key={`link-${lineIdx}-${k++}`} href={url} target="_blank" rel="noopener noreferrer" className={`underline break-all ${msg.direction === 'inbound' ? 'text-white hover:text-white/80' : 'text-blue-600 hover:text-blue-800'}`}>{url}</a>
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
                                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
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
                                        <Play className="w-4 h-4 fill-slate-800 text-slate-800 ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {mainBody && <div className="leading-relaxed">{formatWhatsAppText(mainBody)}</div>}
                                {msg.status === 'failed' && (
                                  <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] leading-tight flex items-start gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                                    <div className="flex-1">
                                      <div className="font-semibold text-rose-800">Delivery Failed</div>
                                      <div className="text-[10.5px] text-rose-600 mt-0.5">
                                        {(msg as any).errorMessage || (msg as any).failureReason || 'Message was not delivered by Meta WhatsApp.'}
                                      </div>
                                      {Boolean((((msg as any).errorMessage || '') + ((msg as any).failureReason || '')).match(/24-Hour|24 hours|template|re-engage/i)) && (
                                        <button
                                          type="button"
                                          onClick={() => setActionModal({ type: 'template' })}
                                          className="mt-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] rounded-md inline-flex items-center gap-1 shadow-xs transition-all"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          Send Template Instead
                                        </button>
                                      )}
                                      {(((msg as any).errorMessage || '') + ((msg as any).failureReason || '')).includes('healthy ecosystem engagement') && (
                                        <div className="text-[10px] text-slate-500 mt-1 italic">
                                          Notice: Recipient reached WhatsApp marketing frequency limits set by Meta. Try again later or send a normal message.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                          <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${msg.direction === 'outbound' ? 'justify-end text-slate-500' : 'justify-start text-slate-400'}`}>
                            {/* Show "Swar Yoga" in bold black for outbound messages with admin tag */}
                            {msg.direction === 'outbound' && (msg.messageContent || '').match(/\[(admincrm|admin|crm)\]\s*$/i) && (
                              <>
                                <span className="font-bold text-slate-800 text-[10.5px]">Swar Yoga</span>
                                <span className="mx-1">•</span>
                              </>
                            )}
                            <span className="tracking-wide">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.direction === 'outbound' && (
                              <div className="flex items-center ml-1" title={(msg as any).errorMessage || (msg as any).failureReason || msg.status}>
                                {msg.status === 'failed' ? (
                                  <X className="w-3.5 h-3.5 text-rose-500" />
                                ) : msg.status === 'queued' || (msg.status as string) === 'sending' ? (
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                ) : msg.status === 'sent' ? (
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                ) : msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                                ) : (
                                  /* delivered or other */ 
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                )}
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

              <div className="px-2 sm:px-3 pt-2 pb-2.5 sm:pb-5 shrink-0 z-30 backdrop-blur-md" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.98) 0%, rgba(240,247,242,0.9) 100%)', borderTop: '1px solid rgba(30,127,67,0.1)', boxShadow: '0 -4px 16px rgba(30,127,67,0.04)' }}>
                <div className="flex items-end gap-1.5 sm:gap-2 max-w-6xl mx-auto">
                  
                  {/* Quick Actions (Actions Button - desktop only, mobile is inside pill) */}
                  <div className="hidden sm:block relative group self-end">
                    <button
                      type="button"
                      onClick={() => setQuickActionsOpen((v) => !v)}
                      className={`h-10 w-10 sm:w-auto sm:px-3 flex items-center justify-center gap-1.5 rounded-full sm:rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md cursor-pointer border shrink-0 ${
                        quickActionsOpen
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white border-emerald-700 shadow-emerald-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700/80 shadow-emerald-600/20'
                      }`}
                      title="Quick actions & features"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                      <span className="hidden sm:inline font-bold">Actions</span>
                    </button>

                    {quickActionsOpen ? (
                      <div className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl flex-col p-2 min-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,242,0.95) 100%)', border: '1px solid rgba(30,127,67,0.15)', boxShadow: '0 8px 32px rgba(30,127,67,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Actions</div>
                          <button
                            type="button"
                            onClick={() => setQuickActionsOpen(false)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-1 px-1 pb-1">
                          <button
                            type="button"
                            onClick={() => openAction('quick')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <Zap className="w-4 h-4 text-emerald-600" />
                            Quick message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('schedule')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <CalendarPlus className="w-4 h-4 text-emerald-600" />
                            Schedule message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('template')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <FileText className="w-4 h-4 text-indigo-600" />
                            Template
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('delay')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <Clock className="w-4 h-4 text-amber-600" />
                            Delay message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('repeat')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <RotateCcw className="w-4 h-4 text-violet-600" />
                            Repeat mode
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('chatbot_flow')}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl flex items-center gap-3 transition-colors font-medium"
                          >
                            <Bot className="w-4 h-4 text-cyan-600" />
                            Chatbot flow
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Main Input Box with Top Toolbar */}
                  {selected?.isBlocked ? (
                    <div className="flex-1 border border-red-200 rounded-md bg-red-50/50 px-4 py-3 flex items-center gap-3">
                      <Ban className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-600">Blocked {selected.blockedReason === 'stop_keyword' ? '— user sent "stop"' : ''}</p>
                      </div>
                      <button
                        onClick={() => selected.leadId && handleBlockSingle(selected.leadId, false)}
                        className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Unblock
                      </button>
                    </div>
                  ) : (
                  <div className="flex-1 min-w-0 rounded-[24px] sm:rounded-2xl bg-white border border-slate-200/60 sm:border-emerald-200/80 shadow-sm focus-within:shadow-md transition-all relative z-20">
                      
                      {/* Top Toolbar - Desktop only */}
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border-b border-emerald-100/80 rounded-t-2xl relative overflow-x-auto no-scrollbar whitespace-nowrap bg-emerald-50/40">
                          {/* Formatting */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToolAction('bold')}
                              title="Bold (*text*)"
                              className="h-7 w-7 flex items-center justify-center text-slate-700 bg-white hover:bg-slate-100 hover:text-black border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToolAction('italic')}
                              title="Italic (_text_)"
                              className="h-7 w-7 flex items-center justify-center text-slate-700 bg-white hover:bg-slate-100 hover:text-black border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToolAction('emoji')}
                              title="Emojis"
                              className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105 ${
                                showEmojiPicker
                                  ? 'text-white bg-amber-500 border border-amber-600'
                                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300'
                              }`}
                            >
                              <Smile className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-[11px] font-semibold hidden sm:inline">Emoji</span>
                            </button>
                            <button
                              onClick={() => handleToolAction('symbols')}
                              title="Special Symbols"
                              className="h-7 px-2 flex items-center gap-1 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                            >
                              <Hash className="w-3.5 h-3.5 text-teal-600" />
                              <span className="text-[11px] font-semibold hidden sm:inline">Symbols</span>
                            </button>
                          </div>

                          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                          {/* Action Shortcuts */}
                          <button
                            type="button"
                            onClick={() => openAction('template')}
                            title="WhatsApp Templates"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 shadow-xs cursor-pointer hover:scale-105"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px] font-semibold">Template</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('quick')}
                            title="Quick Reply"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-xs cursor-pointer hover:scale-105"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                            <span className="text-[11px] font-semibold">Quick</span>
                          </button>

                          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                          {/* AI Tools */}
                          <button
                            onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer hover:scale-105 ${
                              autoCorrectEnabled
                                ? 'bg-emerald-600 text-white border border-emerald-700 shadow-sm'
                                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title={autoCorrectEnabled ? 'Auto-correct is ON' : 'Auto-correct is OFF'}
                          >
                            {autoCorrectEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-400" />}
                            <span className="text-[11px] font-semibold">Auto</span>
                          </button>
                          <button
                            onClick={handleAIFix}
                            disabled={isFixing || !composerText}
                            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-40 disabled:hover:scale-100 ${
                              isFixing
                                ? 'bg-violet-100 text-violet-700 border border-violet-300'
                                : 'bg-violet-600 hover:bg-violet-700 text-white border border-violet-700 hover:scale-105'
                            }`}
                            title="Fix Spelling & Grammar with AI"
                          >
                            {isFixing ? <LoadingSpinner size="sm" /> : <Wand2 className="w-3.5 h-3.5 text-white" />}
                            <span className="text-[11px] font-semibold">Fix</span>
                          </button>
                          <button
                            onClick={handleAIReply}
                            disabled={isReplying}
                            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-40 disabled:hover:scale-100 ${
                              isReplying
                                ? 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300'
                                : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white border border-fuchsia-700 hover:scale-105'
                            }`}
                            title="AI Suggest Reply"
                          >
                            {isReplying ? <LoadingSpinner size="sm" /> : <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />}
                            <span className="text-[11px] font-semibold">AI</span>
                          </button>

                          <LanguageSelector 
                             currentText={composerText} 
                             onTextTranslated={(t) => setComposerText(t)}
                             onTranslate={handleTranslationCall}
                          />
                          
                          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                          {/* Attachment Button */}
                          <div className="relative">
                            <button 
                                onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)} 
                                title="Attach media or files" 
                                className={`h-7 px-2.5 flex items-center gap-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105 ${
                                  attachmentMenuOpen
                                    ? 'text-white bg-emerald-600 border border-emerald-700'
                                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300'
                                }`}
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-semibold">Attach</span>
                            </button>
                            {attachmentMenuOpen && (
                                <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col p-1.5 min-w-[160px] z-50">
                                    <div className="text-[9px] font-bold uppercase text-slate-400 px-2 py-1 tracking-wider">Attach Media</div>
                                    <button className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-left transition-colors cursor-pointer" onClick={() => { handleToolAction('image'); setAttachmentMenuOpen(false); }}>
                                        <ImageIcon className="w-4 h-4 text-emerald-600" /> Send Image
                                    </button>
                                    <button className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 font-semibold hover:bg-rose-50 hover:text-rose-700 rounded-lg text-left transition-colors cursor-pointer" onClick={() => { handleToolAction('video'); setAttachmentMenuOpen(false); }}>
                                        <Video className="w-4 h-4 text-rose-600" /> Send Video
                                    </button>
                                    <button className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 font-semibold hover:bg-blue-50 hover:text-blue-700 rounded-lg text-left transition-colors cursor-pointer" onClick={() => { handleToolAction('document'); setAttachmentMenuOpen(false); }}>
                                        <FileText className="w-4 h-4 text-blue-600" /> Send Document
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
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* 24-Hour WhatsApp Window Notice */}
                      {selected && (!windowRemaining || windowRemaining.diff <= 0) && (
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-50/90 border-b border-amber-200/80 text-amber-900 text-[11.5px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate font-medium text-[11px] sm:text-[11.5px]">24h window closed • Send template to reach customer</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActionModal({ type: 'template' })}
                            className="shrink-0 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] rounded-md flex items-center gap-1 shadow-2xs transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            Send Template
                          </button>
                        </div>
                      )}

                      {/* Input row with Mobile Emoji, Textarea, and Action Icons */}
                      <div className="flex items-center px-1 sm:px-0">
                        {/* Mobile Emoji Button - WhatsApp Style */}
                        <button
                          type="button"
                          onClick={() => handleToolAction('emoji')}
                          className="sm:hidden p-2 text-[#54656f] hover:text-[#111b21] transition-colors shrink-0"
                          title="Emojis"
                        >
                          <Smile className="w-6 h-6 text-[#54656f]" />
                        </button>

                        <div className="flex-1 min-w-0 py-0.5">
                          <SpellCheckTextarea
                            value={composerText}
                            onChange={handleComposerChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Message"
                            className="px-1.5 py-2 sm:px-3 sm:py-2 border-none focus:ring-0 max-h-36 min-h-[38px] placeholder:text-[#8696a0] font-normal text-[#111b21] text-[15px] w-full bg-transparent resize-none leading-relaxed overflow-y-auto"
                            token={token || ''}
                          />
                        </div>

                        {/* Mobile Action Icons inside the pill - EXACTLY like WhatsApp on Android */}
                        <div className="flex items-center sm:hidden shrink-0 pr-1.5 gap-0.5">
                          {/* Quick replies shortcut */}
                          <button
                            type="button"
                            onClick={() => openAction('quick')}
                            className="p-1.5 text-[#54656f] hover:text-amber-500 transition-colors shrink-0"
                            title="Quick replies"
                          >
                            <Zap className="w-5 h-5 text-[#54656f] fill-[#54656f]/20" />
                          </button>

                          {/* Mobile Attach Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                              className="p-1.5 text-[#54656f] hover:text-[#00a884] transition-colors shrink-0"
                              title="Attach Media"
                            >
                              <Paperclip className="w-5 h-5 text-[#54656f] -rotate-45" />
                            </button>
                          </div>

                          {/* Mobile Camera / Photos button */}
                          <button
                            type="button"
                            onClick={() => handleToolAction('image')}
                            className="p-1.5 text-[#54656f] hover:text-[#00a884] transition-colors shrink-0"
                            title="Send Image"
                          >
                            <Camera className="w-5 h-5 text-[#54656f]" />
                          </button>
                        </div>
                      </div>
                  </div>
                  )}

                  {/* Floating Send Button - Authentic WhatsApp Android FAB */}
                  <button 
                    onClick={handleSendMessage}
                    disabled={sending || selected?.isBlocked}
                    className={`h-11 w-11 sm:h-10 sm:w-10 rounded-full font-bold text-xs transition-transform active:scale-95 flex items-center justify-center shrink-0 self-end shadow-md cursor-pointer ${
                      selected?.isBlocked
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-[#00a884]/30'
                    }`}
                    title="Send message"
                  >
                    {sending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5 text-white fill-white" />
                    )}
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
                        <X className="w-5 h-5" />
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
                                  addQuickReply(newQuickReply);
                                  setNewQuickReply('');
                                }
                              }
                            }}
                          />
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button 
                              type="button"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                              onClick={() => {
                                if (newQuickReply.trim()) {
                                  addQuickReply(newQuickReply, true);
                                  setNewQuickReply('');
                                  closeActionModal();
                                }
                              }}
                              title="Add to list and insert into current message"
                            >
                              Add & Use
                            </button>
                            <button 
                              type="button"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95 border border-slate-200 cursor-pointer"
                              onClick={() => {
                                if (newQuickReply.trim()) {
                                  addQuickReply(newQuickReply, false);
                                  setNewQuickReply('');
                                }
                              }}
                              title="Save to list only"
                            >
                              Save Only
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 mb-3">Click any message below to insert into chat, or press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] border border-slate-200">Ctrl+Enter</kbd> to add</p>

                        {/* List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {quickReplies.map(qr => (
                            <div 
                              key={qr.id} 
                              onClick={() => {
                                setComposerText((prev) => (prev ? `${prev} ${qr.text}` : qr.text));
                                closeActionModal();
                              }}
                              className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/60 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                            >
                              <p className="text-sm text-slate-800 font-medium flex-1 whitespace-pre-wrap leading-relaxed">
                                {qr.text}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-xs">
                                  Use
                                </span>
                                <button 
                                  type="button"
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteQuickReply(qr.id);
                                  }}
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {quickReplies.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4 italic">No quick replies yet. Type above and click Add & Use.</p>
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
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mr-2" />
                            Loading flows...
                          </div>
                        ) : chatbotFlows.length === 0 ? (
                          <div className="text-center py-8">
                            <Bot className="w-12 h-12 text-slate-300 mx-auto mb-2" />
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
                                  loadMessages(selected.phoneNumber || selected.leadId || selected._id);
                                  fetchMonthlyExpenses();
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
                            onSchedule={(template) => {
                              // Switch modal to schedule mode but keep the template selected
                              setActionModal({ type: 'schedule', templateId: template._id, templateName: template.templateName });
                              // Ensure scheduleMessage reflects that it's a template
                              setScheduleMessage(`[Template] ${template.templateName}`);
                            }}
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
                                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7F43]/20 focus:border-[#1E7F43] resize-none ${actionModal.templateId ? 'bg-slate-100 text-slate-500 font-mono' : 'bg-slate-50'}`}
                                  rows={3}
                                  placeholder="Type your message..."
                                  value={scheduleMessage || composerText}
                                  onChange={(e) => setScheduleMessage(e.target.value)}
                                  readOnly={!!actionModal.templateId}
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
          ) : needsMetaSetup ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-start bg-slate-50">
              <div className="w-full max-w-3xl">
                <MetaWhatsAppSetupCard
                  token={token}
                  onConnected={() => {
                    setNeedsMetaSetup(false);
                    loadConversations();
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4" style={{ background: 'linear-gradient(180deg, #FAFCFB 0%, #F0F7F2 100%)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(30,127,67,0.08) 0%, rgba(30,127,67,0.18) 100%)', boxShadow: '0 8px 24px rgba(30,127,67,0.1), inset 0 1px 2px rgba(255,255,255,0.5)' }}>
                <WhatsAppIcon className="w-14 h-14 text-[#1E7F43]/40" />
              </div>
              <p className="font-bold text-lg text-slate-500">Select a conversation to start chatting</p>
              <p className="text-xs text-slate-400">Your chats will appear here.</p>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {showSidebar && (
          <aside className="hidden xl:block w-72 p-4 overflow-y-auto shrink-0 backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,247,242,0.9) 100%)', borderLeft: '1px solid rgba(30,127,67,0.1)' }}>
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
                  <h3 className="font-extrabold text-slate-900 leading-tight">
                    {selected.name && selected.name !== 'Unknown User' && !selected.name.match(/^\+?\d+$/)
                      ? selected.name
                      : formatPhoneDisplay(selected.phoneNumber)}
                  </h3>
                  <p className="text-xs text-slate-500">{formatPhoneDisplay(selected.phoneNumber)}</p>
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
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                  {savingSidebar ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
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
                  {selected?.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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
              <User className="w-12 h-12 text-slate-300" />
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
                <X className="w-5 h-5" />
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
                    <FileText className="w-6 h-6 text-slate-400" />
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
                    <Send className="w-4 h-4 text-slate-400" />
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
              <X className="w-6 h-6" />
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
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}


      {/* AI-9 Approval Modal */}
      {isAi9ModalOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                AI-9 Q&A Approval for {selected.name || selected.phoneNumber}
              </h2>
              <button onClick={() => setIsAi9ModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ai9Data.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative group">
                  <button 
                    onClick={() => setAi9Data(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Question {idx + 1}</label>
                    <input 
                      type="text" 
                      value={item.q}
                      onChange={(e) => {
                        const newData = [...ai9Data];
                        newData[idx].q = e.target.value;
                        setAi9Data(newData);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Type question here..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Answer {idx + 1}</label>
                    <textarea 
                      value={item.a}
                      onChange={(e) => {
                        const newData = [...ai9Data];
                        newData[idx].a = e.target.value;
                        setAi9Data(newData);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      placeholder="Type answer here..."
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setAi9Data(prev => [...prev, { q: '', a: '' }])}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsAi9ModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    // Save to lead metadata
                    const payload = {
                      metadata: {
                        ...(selected.metadata || {}),
                        ai9Data: ai9Data
                      }
                    };
                    const token =
                      localStorage.getItem('crm_token') ||
                      localStorage.getItem('adminToken') ||
                      localStorage.getItem('admin_token') ||
                      '';
                    await fetch(`/api/admin/crm/leads/${selected.leadId || selected._id}`, {
                      method: 'PUT',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(payload)
                    });
                    
                    // Trigger broadcast template
                    await fetch('/api/admin/crm/broadcast', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        phones: [selected.phoneNumber],
                        messageType: 'template',
                        templateId: 'YOUR_TEMPLATE_NAME_HERE',
                        source: 'crm_meta_leads_ai9'
                      })
                    });
                    
                    alert('Q&A Saved and Template Triggered!');
                    setIsAi9ModalOpen(false);
                  } catch (e) {
                    console.error(e);
                    alert('Error saving or triggering broadcast.');
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                Approve & Trigger Template
              </button>
            </div>
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
