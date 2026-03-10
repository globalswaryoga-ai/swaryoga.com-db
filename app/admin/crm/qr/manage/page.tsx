'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';

import {
  Sparkles, Phone, Heart, Play, Handshake, CheckCircle, Trophy,
  Users, Send, Mail, Eye, Search, RefreshCw, ChevronDown, ChevronRight,
  X, Filter, Radio, UserPlus, Trash2, ArrowLeftRight,
  Calendar, Globe, Languages, MapPin, MoreHorizontal, ChevronLeft, Link2, Check,
  PauseCircle, Repeat, Flower2, Megaphone,
  Pencil, Receipt, MessageSquare, PhoneCall, Bot, Clock, History, Star, User, Tag, Plus, ExternalLink,
  MessageCircle, ArrowDown, ArrowUp, QrCode, AlertTriangle,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';

import ReceiptPreviewModal from '@/components/admin/crm/ReceiptPreviewModal';
import ChatbotFlowModal from '@/components/admin/crm/ChatbotFlowModal';
import AICallModal from '@/components/admin/crm/AICallModal';
import { AddToBroadcastModal } from '@/components/admin/crm';

// ── Same 4K color palette as Sales Funnel ──
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
  cyan:    { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  pageBg:  '#F8FAFC',
};

const gray    = { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' };
const orange  = { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)' };
const teal    = { main: '#14B8A6', light: '#2DD4BF', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)' };
const purple  = { main: '#A855F7', light: '#C084FC', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)' };

const STAGE_COLORS = [COLORS.indigo, COLORS.blue, COLORS.cyan, COLORS.violet, COLORS.amber, COLORS.emerald, COLORS.pink, gray, orange, teal, purple];
const STAGE_ICONS: Record<string, any> = {
  sparkles: Sparkles, phone: Phone, heart: Heart, play: Play,
  handshake: Handshake, 'check-circle': CheckCircle, trophy: Trophy,
  'pause-circle': PauseCircle, repeat: Repeat, lotus: Flower2, megaphone: Megaphone,
};

interface FunnelStage {
  key: string; name: string; color: string; colorGradient: string;
  order: number; icon: string; isDefault: boolean; description: string;
}

interface Lead {
  _id: string; leadNumber?: string; name: string; phoneNumber: string;
  email?: string; status: string; labels: string[]; source: string;
  workshopName?: string; funnelStage: string; assignedToUserId?: string;
  lastMessageAt?: string; chatStatus?: string; createdAt: string;
  updatedAt: string; country?: string; countryCode?: string;
  region?: string; state?: string; language?: string; languageCode?: string;
  title?: string; displayName?: string;
  firstTouchedAt?: string;
}

interface AdminUser {
  userId: string; name?: string; email?: string;
}

// ── Generate month options for last 24 months ──
function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: '', label: 'All Months' }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    opts.push({ value: val, label: lbl });
  }
  return opts;
}

const MONTH_OPTIONS = getMonthOptions();

// Fixed connection types
const DEFAULT_CONNECTIONS = [
  'Signup', 'Whatsapp', 'Community', 'Website', 'Email', 'Facebook', 'Social media', 'Crm upload',
];

export default function QRManagePage() {
  const router = useRouter();
  const token = useAuth();
  // Data
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    labels: string[]; workshops: string[]; countries: string[]; languages: string[];
  }>({ labels: [], workshops: [], countries: [], languages: [] });

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterWorkshop, setFilterWorkshop] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [customConnections, setCustomConnections] = useState<string[]>([]);

  // Custom filter options from DB
  const [customFilterOptions, setCustomFilterOptions] = useState<{ country: string[]; workshop: string[]; connection: string[] }>({ country: [], workshop: [], connection: [] });
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [isAddingWorkshop, setIsAddingWorkshop] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState('');

  // Merged connections, countries, workshops
  const allConnections = [...new Set([...DEFAULT_CONNECTIONS, ...customFilterOptions.connection, ...customConnections])];
  const allCountries = [...new Set([...filterOptions.countries, ...customFilterOptions.country])].sort();
  const allWorkshops = [...new Set([...filterOptions.workshops, ...customFilterOptions.workshop])].sort();

  // Selection & modals
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStageTarget, setBulkStageTarget] = useState('');
  const [connectionDropdownLeadId, setConnectionDropdownLeadId] = useState<string | null>(null);
  const [chatbotStates, setChatbotStates] = useState<Record<string, { mode: string; hasActiveFlow: boolean; lastBotReplyAt: string | null }>>({});
  const [receiptLeadId, setReceiptLeadId] = useState<string | null>(null);
  const [chatbotFlowLeadId, setChatbotFlowLeadId] = useState<string | null>(null);
  const [aiCallLeadId, setAiCallLeadId] = useState<string | null>(null);
  const [updatesLeadId, setUpdatesLeadId] = useState<string | null>(null);
  const [stageHistory, setStageHistory] = useState<Array<{ _id: string; fromStage: string; toStage: string; changedByName?: string; note?: string; createdAt: string }>>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updatesMetaMsgs, setUpdatesMetaMsgs] = useState<Array<{ _id: string; direction: string; messageContent?: string; templateName?: string; sentAt?: string; createdAt: string }>>([]);
  const [updatesEmails, setUpdatesEmails] = useState<Array<{ _id: string; recipientEmail?: string; recipientName?: string; subject?: string; status?: string; source?: string; createdAt: string }>>([]);
  const [metaMsgsLoading, setMetaMsgsLoading] = useState(false);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [updatesTab, setUpdatesTab] = useState<'overview' | 'chat' | 'email' | 'calls'>('overview');
  const [updatesCalls, setUpdatesCalls] = useState<Array<{ _id: string; purpose: string; status: string; language: string; duration: number; summary: string; sentiment: string; callEndedReason: string; crmUpdates: any[]; createdAt: string }>>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [windowStatus, setWindowStatus] = useState<Record<string, { lastInboundAt: string | null; expiresAt: string | null; isOpen: boolean }>>({});
  const [now, setNow] = useState(Date.now());

  // Delete confirmation
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Schedule modals
  const [showScheduleWA, setShowScheduleWA] = useState(false);
  const [showScheduleEmail, setShowScheduleEmail] = useState(false);

  // Tick every second for countdown timers
  const windowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const hasOpen = Object.values(windowStatus).some(w => w.isOpen);
    if (hasOpen) {
      windowTimerRef.current = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => { if (windowTimerRef.current) clearInterval(windowTimerRef.current); };
  }, [windowStatus]);

  const selectAll = selectedLeadIds.size === leads.length && leads.length > 0;

  useEffect(() => {
    try {
      setIsSuperAdmin(checkIsSuperAdmin());
    } catch { setIsSuperAdmin(false); }
  }, []);

  // Fetch custom filter options from DB
  const fetchCustomFilterOptions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/filter-options', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.options) setCustomFilterOptions(json.data.options);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Add a custom filter option to DB
  const addCustomFilterOption = async (category: 'country' | 'workshop' | 'connection', value: string) => {
    if (!token || !value.trim()) return;
    try {
      const res = await fetch('/api/admin/crm/filter-options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, value: value.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.values) {
          setCustomFilterOptions(prev => ({ ...prev, [category]: json.data.values }));
        }
      }
    } catch (e) { console.error(e); }
  };

  // Fetch funnel config
  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStages((json.data.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/auth/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setAdminUsers(
          (Array.isArray(json?.data) ? json.data : [])
            .map((u: any) => ({ userId: String(u?.userId || ''), name: u?.name, email: u?.email }))
            .filter((u: AdminUser) => u.userId)
        );
      }
    } catch (e) { console.error(e); }
  }, [token, isSuperAdmin]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('all', '1');
        params.set('search', searchQuery);
      } else if (activeStage) {
        params.set('stage', activeStage);
      } else {
        params.set('all', '1');
      }
      if (filterCountry) params.set('country', filterCountry);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterAdmin) params.set('assignedTo', filterAdmin);
      if (filterWorkshop) params.set('workshop', filterWorkshop);
      if (filterLabel) params.set('label', filterLabel);
      if (filterMonth) params.set('month', filterMonth);
      params.set('limit', String(LIMIT));
      params.set('skip', String(page * LIMIT));
      params.set('source', 'qr_whatsapp');

      const res = await fetch(`/api/admin/crm/funnel/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStageCounts(json.data.stageCounts || {});
        const fetchedLeads = json.data.leads || [];
        setLeads(fetchedLeads);
        setTotalLeads(json.data.totalLeads || 0);
        if (json.data.filters) setFilterOptions(json.data.filters);

        // Fetch chatbot states
        if (fetchedLeads.length > 0) {
          const ids = fetchedLeads.map((l: any) => l._id).join(',');
          try {
            const cbRes = await fetch(`/api/admin/crm/chatbot/states?leadIds=${ids}`, { headers: { Authorization: `Bearer ${token}` } });
            if (cbRes.ok) {
              const cbJson = await cbRes.json();
              setChatbotStates(cbJson.states || {});
            }
          } catch (_) { /* ignore */ }

          // Fetch WhatsApp 24h window status
          try {
            const wsRes = await fetch(`/api/admin/crm/whatsapp/window-status?leadIds=${ids}`, { headers: { Authorization: `Bearer ${token}` } });
            if (wsRes.ok) {
              const wsJson = await wsRes.json();
              setWindowStatus(wsJson.windows || {});
              setNow(Date.now());
            }
          } catch (_) { /* ignore */ }
        } else {
          setChatbotStates({});
          setWindowStatus({});
        }
      }
    } catch (e) { console.error(e); }
  }, [token, activeStage, searchQuery, filterCountry, filterLanguage, filterAdmin, filterWorkshop, filterLabel, filterMonth, page]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchAdminUsers(), fetchCustomFilterOptions()]);
      setLoading(false);
    };
    if (token) load();
  }, [token, fetchConfig, fetchAdminUsers, fetchCustomFilterOptions]);

  useEffect(() => {
    if (token) fetchLeads();
  }, [token, fetchLeads]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [activeStage, searchQuery, filterCountry, filterLanguage, filterAdmin, filterWorkshop, filterLabel, filterMonth]);

  // Move lead
  const moveLead = async (leadId: string, toStage: string) => {
    if (!token) return;
    try {
      await fetch('/api/admin/crm/funnel/move', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, toStage }),
      });
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  // Touch lead
  const touchLead = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    if (!lead || lead.firstTouchedAt || !token) return;
    try {
      await fetch('/api/admin/crm/funnel/touch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, firstTouchedAt: new Date().toISOString() } : l));
    } catch (e) { console.error(e); }
  }, [leads, token]);

  // Delete lead
  const deleteLead = async (leadId: string) => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l._id !== leadId));
        setTotalLeads(prev => prev - 1);
        setDeleteLeadId(null);
      }
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  // Bulk delete leads
  const bulkDeleteLeads = async () => {
    if (!token || selectedLeadIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedLeadIds).map(id =>
          fetch(`/api/admin/crm/leads/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setSelectedLeadIds(new Set());
      setShowBulkDeleteConfirm(false);
      fetchLeads();
    } catch (e) { console.error(e); }
    setBulkDeleting(false);
  };

  // Bulk move
  const bulkMoveLeads = async (toStage: string) => {
    if (!token || selectedLeadIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedLeadIds).map(id =>
          fetch('/api/admin/crm/funnel/move', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: id, toStage }),
          })
        )
      );
      setSelectedLeadIds(new Set());
      setBulkStageTarget('');
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  const toggleSelectAll = () => {
    if (selectAll) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(leads.map(l => l._id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Toggle connection label
  const toggleConnection = async (leadId: string, connection: string) => {
    if (!token || !connection.trim()) return;
    try {
      const lead = leads.find(l => l._id === leadId);
      const current = lead?.labels || [];
      const has = current.includes(connection.trim());
      const updated = has ? current.filter(c => c !== connection.trim()) : [...current, connection.trim()];
      await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: updated }),
      });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, labels: updated } : l));
    } catch (e) { console.error(e); }
  };

  // Fetch stage history + messages + emails
  const fetchStageHistory = async (leadId: string) => {
    setUpdatesLeadId(leadId);
    setUpdatesLoading(true);
    setMetaMsgsLoading(true);
    setEmailsLoading(true);
    setStageHistory([]);
    setUpdatesMetaMsgs([]);
    setUpdatesEmails([]);
    setUpdateNote('');
    setUpdatesTab('overview');
    setUpdatesCalls([]);

    const lead = leads.find(l => l._id === leadId);

    const [histRes, msgRes, emlRes] = await Promise.allSettled([
      fetch(`/api/admin/crm/funnel/stage-history?leadId=${leadId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/admin/crm/messages?leadId=${leadId}&provider=meta&limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
      lead?.email
        ? fetch(`/api/admin/crm/email/logs?search=${encodeURIComponent(lead.email)}&limit=30`, { headers: { Authorization: `Bearer ${token}` } })
        : Promise.resolve(null),
    ]);

    if (histRes.status === 'fulfilled' && histRes.value?.ok) {
      const json = await histRes.value.json();
      setStageHistory(json.data?.history || []);
    }
    setUpdatesLoading(false);

    if (msgRes.status === 'fulfilled' && msgRes.value?.ok) {
      const json = await msgRes.value.json();
      setUpdatesMetaMsgs(json.data?.messages || []);
    }
    setMetaMsgsLoading(false);

    if (emlRes.status === 'fulfilled' && emlRes.value && emlRes.value.ok) {
      const json = await emlRes.value.json();
      setUpdatesEmails(json.data?.logs || json.data || []);
    }
    setEmailsLoading(false);
  };

  // Add note
  const addUpdateNote = async () => {
    if (!updatesLeadId || !updateNote.trim() || !token) return;
    setAddingNote(true);
    try {
      const res = await fetch('/api/admin/crm/funnel/stage-history', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: updatesLeadId, note: updateNote.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        const entry = json.data?.entry;
        if (entry) {
          setStageHistory(prev => [{ _id: entry._id, fromStage: '', toStage: '', changedByName: entry.changedByName, note: entry.note, createdAt: entry.createdAt }, ...prev]);
        }
        setUpdateNote('');
      }
    } catch (_) { /* ignore */ }
    setAddingNote(false);
  };

  // Helpers
  const getStageName = (key: string) => stages.find(s => s.key === key)?.name || key;

  const formatWindowCountdown = (leadId: string): { text: string; isOpen: boolean } => {
    const ws = windowStatus[leadId];
    if (!ws?.isOpen || !ws.expiresAt) return { text: '00:00', isOpen: false };
    const remaining = new Date(ws.expiresAt).getTime() - now;
    if (remaining <= 0) return { text: '00:00', isOpen: false };
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return {
      text: hrs > 0 ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      isOpen: true,
    };
  };

  const getStageColor = (idx: number) => STAGE_COLORS[idx % STAGE_COLORS.length];
  const getStageIcon = (icon: string) => STAGE_ICONS[icon] || Sparkles;

  const totalPipelineLeads = Object.values(stageCounts).reduce((s, c) => s + c, 0);
  const totalPages = Math.ceil(totalLeads / LIMIT);
  const openWindowCount = Object.values(windowStatus).filter(w => w.isOpen).length;

  // Sort leads: new_lead stage first, then open-window leads, then the rest
  const sortedLeads = [...leads].sort((a, b) => {
    const aNew = (!a.funnelStage || a.funnelStage === 'new_lead') ? 1 : 0;
    const bNew = (!b.funnelStage || b.funnelStage === 'new_lead') ? 1 : 0;
    if (bNew !== aNew) return bNew - aNew;
    const aOpen = windowStatus[a._id]?.isOpen ? 1 : 0;
    const bOpen = windowStatus[b._id]?.isOpen ? 1 : 0;
    return bOpen - aOpen;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading QR WhatsApp Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.pageBg }}>
      {/* ══════════════════════════════════════════════════════════════════════
          ── LEFT SIDEBAR: Pipeline Stages ──
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-white border-r border-gray-100 transition-all duration-300 flex flex-col`}
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* Sidebar header */}
        <div className="px-3 py-4 border-b border-gray-100 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h3 className="text-sm font-semibold text-gray-700 tracking-wide uppercase flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-emerald-600" /> Pipeline
            </h3>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* All leads button */}
        <button
          onClick={() => setActiveStage('')}
          className={`w-full px-3 py-3 flex items-center gap-3 transition text-left border-b border-gray-50 ${
            !activeStage ? 'bg-emerald-50/80' : 'hover:bg-gray-50/80'
          }`}
          style={!activeStage ? { borderLeft: `3px solid ${COLORS.emerald.main}` } : { borderLeft: '3px solid transparent' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${COLORS.emerald.main}, ${COLORS.cyan.main})` }}
          >
            <Users className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-800">All Leads</div>
              <div className="text-xs text-gray-400">{totalPipelineLeads}</div>
            </div>
          )}
        </button>

        {/* Stage buttons */}
        <div className="flex-1 overflow-y-auto">
          {/* Meta Window Active */}
          {openWindowCount > 0 && (
            <div
              className="w-full px-3 py-3 flex items-center gap-3 border-b border-gray-50"
              style={{ borderLeft: '3px solid #22C55E', background: '#f0fdf4' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
              >
                <Star className="h-4 w-4 text-white animate-pulse" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    Meta Window
                  </div>
                  <div className="text-[11px] text-green-600">Active conversations</div>
                </div>
              )}
              <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-green-600 text-white text-[11px] font-bold shadow">
                {openWindowCount}
              </span>
            </div>
          )}
          {stages.map((stage, idx) => {
            const color = getStageColor(idx);
            const Icon = getStageIcon(stage.icon);
            const count = stageCounts[stage.key] || 0;
            const isActive = activeStage === stage.key;

            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(isActive ? '' : stage.key)}
                className={`w-full px-3 py-3 flex items-center gap-3 transition text-left border-b border-gray-50 ${
                  isActive ? '' : 'hover:bg-gray-50/80'
                }`}
                style={{
                  backgroundColor: isActive ? color.bg : undefined,
                  borderLeft: isActive ? `3px solid ${color.main}` : '3px solid transparent',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color.main}, ${color.light})` }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{stage.name}</div>
                    <div className="text-xs text-gray-400">{count} leads</div>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="text-lg font-bold flex-shrink-0" style={{ color: color.main }}>{count}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Back links */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-gray-100 space-y-1.5">
            <button
              onClick={() => router.push('/admin/crm/qr')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition"
            >
              <QrCode className="h-3.5 w-3.5" /> QR WhatsApp Dashboard
            </button>
            <button
              onClick={() => router.push('/admin/crm/funnel/manage')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> CRM Funnel Manage
            </button>
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          ── MAIN CONTENT ──
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── HEADER / MENUBAR ── */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm/qr')}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 transition shadow-sm"
                style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}
                title="Back to QR WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                  {activeStage ? stages.find(s => s.key === activeStage)?.name || 'Leads' : 'QR WhatsApp – All Pipeline Leads'}
                </h1>
                <p className="text-xs text-gray-400">{totalLeads} leads {activeStage && `in this stage`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* ── Bulk Actions (auto-show when selected) ── */}
              {selectedLeadIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))' }}>
                  <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                    {selectedLeadIds.size} selected
                  </span>
                  <div className="h-3.5 w-px bg-emerald-200" />

                  {/* Schedule WhatsApp */}
                  <button
                    onClick={() => {
                      const ids = Array.from(selectedLeadIds).join(',');
                      router.push(`/admin/crm/broadcast?leadIds=${encodeURIComponent(ids)}`);
                    }}
                    title="Schedule WhatsApp"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90"
                    style={{ background: '#25D366' }}
                  >
                    <Send className="h-3 w-3" /> Schedule WA
                  </button>

                  {/* Broadcast */}
                  <button
                    onClick={() => setBroadcastModalOpen(true)}
                    title="Broadcast"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition hover:opacity-90"
                    style={{ background: COLORS.indigo.main }}
                  >
                    <Radio className="h-3 w-3" /> Broadcast
                  </button>

                  {/* Schedule Email */}
                  <button
                    onClick={() => {
                      const ids = Array.from(selectedLeadIds).join(',');
                      router.push(`/admin/crm/email?leadIds=${encodeURIComponent(ids)}`);
                    }}
                    title="Schedule Email"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                  >
                    <Mail className="h-3 w-3" /> Schedule Email
                  </button>

                  {/* Bulk Move Stage */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      title="Move stage"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                    >
                      <ArrowLeftRight className="h-3 w-3" /> Move <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                    {showBulkActions && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                        {stages.map((s, idx) => {
                          const c = getStageColor(idx);
                          return (
                            <button
                              key={s.key}
                              onClick={() => { bulkMoveLeads(s.key); setShowBulkActions(false); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"
                            >
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.main }} />
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bulk Delete */}
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    title="Delete selected"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>

                  {/* Clear */}
                  <button
                    onClick={() => setSelectedLeadIds(new Set())}
                    title="Clear selection"
                    className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm w-52 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                />
              </div>
              <button
                onClick={() => fetchLeads()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition shadow-sm"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* Admin user */}
            {isSuperAdmin && (
              <select
                value={filterAdmin}
                onChange={e => setFilterAdmin(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none flex-shrink-0"
              >
                <option value="">All Admins</option>
                {adminUsers.map(a => (
                  <option key={a.userId} value={a.userId}>{a.name || a.userId}</option>
                ))}
              </select>
            )}

            {/* Month */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none flex-shrink-0"
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Language */}
            <select
              value={filterLanguage}
              onChange={e => setFilterLanguage(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none flex-shrink-0"
            >
              <option value="">All Languages</option>
              {filterOptions.languages.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Country */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
              >
                <option value="">All Countries</option>
                {allCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {isAddingCountry ? (
                <div className="flex items-center gap-0.5">
                  <input
                    type="text"
                    value={newCountry}
                    onChange={e => setNewCountry(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCountry.trim()) {
                        addCustomFilterOption('country', newCountry.trim());
                        setNewCountry(''); setIsAddingCountry(false);
                      } else if (e.key === 'Escape') {
                        setNewCountry(''); setIsAddingCountry(false);
                      }
                    }}
                    placeholder="New country..."
                    autoFocus
                    className="px-2 py-1.5 rounded-lg border border-emerald-300 text-sm w-28 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <button onClick={() => { if (newCountry.trim()) addCustomFilterOption('country', newCountry.trim()); setNewCountry(''); setIsAddingCountry(false); }} className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewCountry(''); setIsAddingCountry(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingCountry(true)} title="Add country" className="p-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition border border-dashed border-emerald-300">+</button>
              )}
            </div>

            {/* Workshop */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select
                value={filterWorkshop}
                onChange={e => setFilterWorkshop(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
              >
                <option value="">All Workshops</option>
                {allWorkshops.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              {isAddingWorkshop ? (
                <div className="flex items-center gap-0.5">
                  <input
                    type="text"
                    value={newWorkshop}
                    onChange={e => setNewWorkshop(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newWorkshop.trim()) {
                        addCustomFilterOption('workshop', newWorkshop.trim());
                        setNewWorkshop(''); setIsAddingWorkshop(false);
                      } else if (e.key === 'Escape') {
                        setNewWorkshop(''); setIsAddingWorkshop(false);
                      }
                    }}
                    placeholder="New workshop..."
                    autoFocus
                    className="px-2 py-1.5 rounded-lg border border-emerald-300 text-sm w-28 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <button onClick={() => { if (newWorkshop.trim()) addCustomFilterOption('workshop', newWorkshop.trim()); setNewWorkshop(''); setIsAddingWorkshop(false); }} className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewWorkshop(''); setIsAddingWorkshop(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingWorkshop(true)} title="Add workshop" className="p-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition border border-dashed border-emerald-300">+</button>
              )}
            </div>

            {/* Connection */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select
                value={filterLabel}
                onChange={e => setFilterLabel(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
              >
                <option value="">All Connections</option>
                {allConnections.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {isAddingLabel ? (
                <div className="flex items-center gap-0.5">
                  <input
                    type="text"
                    value={newFilterLabel}
                    onChange={e => setNewFilterLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newFilterLabel.trim()) {
                        addCustomFilterOption('connection', newFilterLabel.trim());
                        if (!allConnections.includes(newFilterLabel.trim())) {
                          setCustomConnections(prev => [...prev, newFilterLabel.trim()]);
                        }
                        setNewFilterLabel(''); setIsAddingLabel(false);
                      } else if (e.key === 'Escape') {
                        setNewFilterLabel(''); setIsAddingLabel(false);
                      }
                    }}
                    placeholder="New connection..."
                    autoFocus
                    className="px-2 py-1.5 rounded-lg border border-emerald-300 text-sm w-28 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <button onClick={() => { if (newFilterLabel.trim()) { addCustomFilterOption('connection', newFilterLabel.trim()); if (!allConnections.includes(newFilterLabel.trim())) setCustomConnections(prev => [...prev, newFilterLabel.trim()]); } setNewFilterLabel(''); setIsAddingLabel(false); }} className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setNewFilterLabel(''); setIsAddingLabel(false); }} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingLabel(true)} title="Add connection" className="p-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition border border-dashed border-emerald-300">+</button>
              )}
            </div>

            {/* Clear filters */}
            {(searchQuery || filterAdmin || filterMonth || filterLanguage || filterCountry || filterWorkshop || filterLabel) && (
              <button
                onClick={() => {
                  setSearchQuery(''); setFilterAdmin(''); setFilterMonth('');
                  setFilterLanguage(''); setFilterCountry(''); setFilterWorkshop('');
                  setFilterLabel('');
                }}
                className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            ── LEADS LIST ──
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-3 space-y-1">
          {/* Select all bar */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50/80 rounded-xl mb-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select All</span>
            <span className="text-xs text-gray-400 ml-auto">{totalLeads} leads total</span>
          </div>

          {leads.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No leads found. Adjust your filters.</div>
          )}

          {sortedLeads.map((lead) => {
            const stageIdx = stages.findIndex(s => s.key === lead.funnelStage);
            const stageColor = stageIdx >= 0 ? getStageColor(stageIdx) : COLORS.indigo;
            const stageName = stages.find(s => s.key === lead.funnelStage)?.name || lead.funnelStage || 'New Lead';
            const isSelected = selectedLeadIds.has(lead._id);
            const isUntouched = !lead.funnelStage || lead.funnelStage === 'new_lead';

            return (
              <div
                key={lead._id}
                className={`rounded-xl border transition-all duration-150 hover:shadow-md flex ${
                  isUntouched
                    ? 'border-yellow-300 shadow-sm hover:border-yellow-400'
                    : isSelected
                      ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-gray-50/30'
                }`}
                style={isUntouched ? { background: 'linear-gradient(90deg, #FFF9E6 0%, #FFFDF5 100%)' } : undefined}
              >
                {/* ── Left: Lead Info (2 rows) ── */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Main info */}
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead._id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                    />

                    {/* Lead number */}
                    {lead.leadNumber && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0 font-mono">#{lead.leadNumber}</span>
                    )}

                    {/* NEW badge */}
                    {isUntouched && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400 text-yellow-900 flex-shrink-0 animate-pulse">
                        NEW
                      </span>
                    )}

                    {/* Name */}
                    <button
                      onClick={() => setSelectedLeadId(lead._id)}
                      className="text-sm font-semibold text-gray-800 hover:text-emerald-600 transition truncate text-left flex-shrink-0 max-w-[200px]"
                    >
                      {lead.title ? `${lead.title}. ` : ''}{lead.name || lead.displayName || 'Unknown'}
                    </button>

                    {/* Mobile */}
                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                      {lead.phoneNumber || '—'}
                    </span>

                    {/* Email */}
                    {lead.email && (
                      <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}

                    {/* Country */}
                    {lead.country ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 whitespace-nowrap flex-shrink-0">
                        {lead.country}
                      </span>
                    ) : null}

                    {/* Language */}
                    {lead.language ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 flex-shrink-0">{lead.language}</span>
                    ) : null}

                    {/* Region */}
                    {lead.region && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        lead.region === 'South India' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {lead.region === 'South India' ? '🌴' : '🏔️'} {lead.region}
                      </span>
                    )}

                    {/* Stage badge */}
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${stageColor.main}, ${stageColor.light})` }}
                    >
                      {stageName}
                    </span>
                  </div>

                  {/* Row 2: Secondary details */}
                  <div className="flex items-center gap-2.5 px-4 py-1.5 border-t border-gray-50 bg-gray-50/30">
                    <div className="w-4 flex-shrink-0" />

                    {/* Joined date */}
                    <span className="text-[11px] text-gray-400 flex-shrink-0 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>

                    {lead.workshopName && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 flex-shrink-0">
                        {lead.workshopName}
                      </span>
                    )}
                    {lead.source && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                        {lead.source}
                      </span>
                    )}

                    {/* Connections Dropdown */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectionDropdownLeadId(connectionDropdownLeadId === lead._id ? null : lead._id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition border ${
                          (lead.labels?.length || 0) > 0
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Link2 className="h-3 w-3" />
                        {(lead.labels?.length || 0) > 0
                          ? `${lead.labels!.slice(0, 2).join(', ')}${lead.labels!.length > 2 ? ` +${lead.labels!.length - 2}` : ''}`
                          : 'Connections'
                        }
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>

                      {connectionDropdownLeadId === lead._id && (
                        <div
                          className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 max-h-64 overflow-y-auto"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Connections</div>
                          {allConnections.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-400 italic">No connections available</div>
                          )}
                          {allConnections.map(conn => {
                            const isActive = (lead.labels || []).includes(conn);
                            return (
                              <button
                                key={conn}
                                onClick={() => toggleConnection(lead._id, conn)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition hover:bg-gray-50 ${
                                  isActive ? 'text-emerald-600 font-medium' : 'text-gray-600'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-emerald-500 text-white' : 'border border-gray-300'
                                }`}>
                                  {isActive && <Check className="h-3 w-3" />}
                                </span>
                                {conn}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {lead.lastMessageAt && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">
                        Last msg: {new Date(lead.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}

                    {/* WhatsApp 24h Window Timer */}
                    {(() => {
                      const { text, isOpen } = formatWindowCountdown(lead._id);
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold flex-shrink-0 ${
                            isOpen
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}
                          title={isOpen ? 'Meta chat window open – free-form messaging allowed' : 'Chat window closed – only templates allowed'}
                        >
                          <Clock className={`h-3 w-3 ${isOpen ? 'text-green-500' : 'text-gray-300'}`} />
                          {text}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    ── RIGHT: Action Buttons (3 rows) ──
                    View | Edit | Delete | Call | SMS | Email | Chatbot
                ══════════════════════════════════════════════════════════════ */}
                <div className="flex flex-col gap-1 px-3 py-1 border-l border-gray-100 flex-shrink-0">
                  {/* Row 1: View, Edit, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { touchLead(lead._id); setSelectedLeadId(lead._id); }}
                      title="View details"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition whitespace-nowrap"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                    <button
                      onClick={() => { touchLead(lead._id); setSelectedLeadId(lead._id); }}
                      title="Edit lead"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition whitespace-nowrap"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteLeadId(lead._id)}
                      title="Delete lead"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition whitespace-nowrap"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                    <div className="relative group">
                      <button
                        title="Move stage"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition whitespace-nowrap"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        Move
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-40 hidden group-hover:block">
                        {stages.filter(s => s.key !== lead.funnelStage).map((s) => {
                          const c = getStageColor(stages.findIndex(st => st.key === s.key));
                          return (
                            <button
                              key={s.key}
                              onClick={() => { touchLead(lead._id); moveLead(lead._id, s.key); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"
                            >
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.main }} />
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Call, SMS, Email, Chatbot */}
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${lead.phoneNumber || ''}`}
                      title="Call"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-green-50 text-green-600 hover:bg-green-100 transition whitespace-nowrap"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Call
                    </a>
                    <a
                      href={`sms:${lead.phoneNumber || ''}`}
                      title="Send SMS"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition whitespace-nowrap"
                    >
                      <MessageSquare className="h-3 w-3" />
                      SMS
                    </a>
                    <a
                      href={`mailto:${lead.email || ''}`}
                      title="Send email"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition whitespace-nowrap"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                    <button
                      onClick={() => {
                        touchLead(lead._id);
                        const phone = (lead.phoneNumber || '').replace(/\D/g, '');
                        if (phone) {
                          router.push(`/admin/crm/qr?phone=${phone}`);
                        }
                        setChatbotFlowLeadId(lead._id);
                      }}
                      title={(() => {
                        const cb = chatbotStates[lead._id];
                        if (!cb || !cb.hasActiveFlow) return 'Chatbot Off';
                        if (cb.lastBotReplyAt && (Date.now() - new Date(cb.lastBotReplyAt).getTime()) > 7 * 24 * 60 * 60 * 1000) return 'Chatbot Stale (>7 days)';
                        if (cb.hasActiveFlow && cb.mode === 'bot' && !cb.lastBotReplyAt) return 'Chatbot On but not working';
                        return 'Chatbot Active';
                      })()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition whitespace-nowrap relative"
                    >
                      <Bot className="h-3 w-3" />
                      Chatbot
                      {(() => {
                        const cb = chatbotStates[lead._id];
                        let color = '#EAB308';
                        let symbol = '−';
                        let tip = 'Off';
                        if (cb && cb.hasActiveFlow) {
                          if (cb.lastBotReplyAt) {
                            const age = Date.now() - new Date(cb.lastBotReplyAt).getTime();
                            if (age > 7 * 24 * 60 * 60 * 1000) {
                              color = '#3B82F6'; symbol = '!'; tip = '>7d';
                            } else {
                              color = '#22C55E'; symbol = '✓'; tip = 'On';
                            }
                          } else {
                            color = '#EF4444'; symbol = '✕'; tip = 'Error';
                          }
                        }
                        return (
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border-2 border-white text-[6px] font-bold text-white shadow-sm"
                            style={{ background: color }}
                            title={tip}
                          >
                            {symbol}
                          </span>
                        );
                      })()}
                    </button>
                    <button
                      onClick={() => { touchLead(lead._id); setAiCallLeadId(lead._id); }}
                      title="AI Call"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition whitespace-nowrap"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Call
                    </button>
                  </div>

                  {/* Row 3: Receipts + Updates */}
                  <div className="flex items-center gap-1 justify-center">
                    <button
                      onClick={() => { touchLead(lead._id); setReceiptLeadId(lead._id); }}
                      title="Receipts"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition whitespace-nowrap"
                    >
                      <Receipt className="h-3 w-3" />
                      Receipts
                    </button>
                    <button
                      onClick={() => fetchStageHistory(lead._id)}
                      title="Stage change updates"
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold text-green-800 transition hover:opacity-90 whitespace-nowrap"
                      style={{ background: '#E8E0F0' }}
                    >
                      <History className="h-3 w-3" />
                      Updates
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, totalLeads)} of {totalLeads}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const p = start + i;
                if (p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      page === p
                        ? 'text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={page === p ? { background: `linear-gradient(135deg, ${COLORS.emerald.main}, ${COLORS.cyan.main})` } : {}}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          ── MODALS ──
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Delete Confirmation Modal */}
      {deleteLeadId && (() => {
        const dl = leads.find(l => l._id === deleteLeadId);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setDeleteLeadId(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-[380px] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Delete Lead</h3>
                  <p className="text-[11px] text-red-500">This action cannot be undone</p>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete <strong>{dl?.name || dl?.displayName || 'this lead'}</strong>
                  {dl?.phoneNumber && <span className="text-gray-500"> ({dl.phoneNumber})</span>}?
                </p>
              </div>
              <div className="px-5 py-3 bg-gray-50 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteLeadId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteLead(deleteLeadId)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[380px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">Bulk Delete</h3>
                <p className="text-[11px] text-red-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <strong>{selectedLeadIds.size} leads</strong>? All data will be permanently removed.
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={bulkDeleteLeads}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {bulkDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete {selectedLeadIds.size} Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId}
          token={token}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => fetchLeads()}
          adminUsers={adminUsers}
          labelOptions={allConnections}
          workshopOptions={filterOptions.workshops}
          stages={stages.map(s => ({ key: s.key, name: s.name, color: s.color }))}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Broadcast Modal */}
      <AddToBroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        leads={selectedLeadIds.size > 0 ? leads.filter(l => selectedLeadIds.has(l._id)) : leads}
        token={token || undefined}
        onSuccess={() => { setBroadcastModalOpen(false); setSelectedLeadIds(new Set()); }}
      />

      {/* Receipt Preview Modal */}
      {receiptLeadId && token && (() => {
        const rl = leads.find(l => l._id === receiptLeadId);
        return (
          <ReceiptPreviewModal
            leadId={receiptLeadId}
            leadName={rl?.name || ''}
            leadPhone={rl?.phoneNumber || ''}
            leadEmail={rl?.email || ''}
            token={token}
            onClose={() => setReceiptLeadId(null)}
          />
        );
      })()}

      {/* Chatbot Flow Modal */}
      {chatbotFlowLeadId && token && (() => {
        const cl = leads.find(l => l._id === chatbotFlowLeadId);
        return (
          <ChatbotFlowModal
            leadId={chatbotFlowLeadId}
            leadName={cl?.name || ''}
            leadPhone={cl?.phoneNumber?.replace(/\D/g, '') || ''}
            token={token}
            onClose={() => setChatbotFlowLeadId(null)}
            onFlowChanged={async () => {
              await new Promise(r => setTimeout(r, 600));
              const ids = leads.map(l => l._id).join(',');
              if (ids && token) {
                try {
                  const cbRes = await fetch(`/api/admin/crm/chatbot/states?leadIds=${ids}`, { headers: { Authorization: `Bearer ${token}` } });
                  const cbJson = await cbRes.json();
                  if (cbJson.success) setChatbotStates(cbJson.states || {});
                } catch {}
              }
            }}
          />
        );
      })()}

      {/* AI Call Modal */}
      {aiCallLeadId && token && (() => {
        const cl = leads.find(l => l._id === aiCallLeadId);
        return (
          <AICallModal
            leadId={aiCallLeadId}
            leadName={cl?.displayName || cl?.name || ''}
            leadPhone={cl?.phoneNumber?.replace(/\D/g, '') || ''}
            token={token}
            onClose={() => setAiCallLeadId(null)}
          />
        );
      })()}

      {/* ── Updates Popup (Chat-widget style, bottom-right) ── */}
      {updatesLeadId && (() => {
        const ul = leads.find(l => l._id === updatesLeadId);
        if (!ul) return null;
        const assignedAdmin = adminUsers.find(a => a.userId === ul.assignedToUserId);
        const stageIdx = stages.findIndex(s => s.key === ul.funnelStage);
        const stageColor = stageIdx >= 0 ? getStageColor(stageIdx) : COLORS.indigo;
        const stageName = stages.find(s => s.key === ul.funnelStage)?.name || ul.funnelStage || 'New Lead';

        const fmtDt = (d: string) => {
          const dt = new Date(d);
          return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        };

        return (
          <div className="fixed inset-0 z-[60]" onClick={() => setUpdatesLeadId(null)}>
            <div
              className="absolute bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 48px)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Green Header */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#00684A' }}>
                <button onClick={() => setUpdatesLeadId(null)} className="p-0.5 rounded hover:bg-white/20 transition flex-shrink-0">
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: '#00ED64', color: '#00684A' }}>
                  {(ul.name || ul.displayName || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{ul.title ? `${ul.title}. ` : ''}{ul.name || ul.displayName || 'Unknown'}</p>
                  <p className="text-green-200 text-[11px] truncate">Lead Updates & History</p>
                </div>
                <button onClick={() => setUpdatesLeadId(null)} className="p-1 rounded hover:bg-white/20 transition flex-shrink-0">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Tab Bar */}
              <div className="flex border-b border-gray-200 bg-white">
                {([
                  { key: 'overview' as const, label: 'Overview', icon: User },
                  { key: 'chat' as const, label: `Chat (${updatesMetaMsgs.length})`, icon: MessageSquare },
                  { key: 'email' as const, label: `Email (${updatesEmails.length})`, icon: Mail },
                  { key: 'calls' as const, label: `Calls (${updatesCalls.length})`, icon: PhoneCall },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setUpdatesTab(tab.key);
                      if (tab.key === 'calls' && updatesCalls.length === 0 && !callsLoading && updatesLeadId) {
                        (async () => {
                          setCallsLoading(true);
                          try {
                            const res = await fetch(`/api/admin/crm/calls?leadId=${updatesLeadId}`, { headers: { Authorization: `Bearer ${token}` } });
                            if (res.ok) {
                              const json = await res.json();
                              setUpdatesCalls(json.data?.calls || []);
                            }
                          } catch (_) {}
                          setCallsLoading(false);
                        })();
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold border-b-2 transition ${
                      updatesTab === tab.key
                        ? 'border-green-600 text-green-700'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ background: '#F9FAFB', maxHeight: '60vh' }}>
                {/* OVERVIEW TAB */}
                {updatesTab === 'overview' && (
                  <>
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500">
                      <span className="flex-shrink-0 mt-0.5">ℹ️</span>
                      <span>Joined on <strong>{new Date(ul.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> · Lead #{ul.leadNumber || '—'}</span>
                    </div>

                    {/* User Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#EFF6FF' }}>
                        <User className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-800">User Details</span>
                      </div>
                      <div className="px-3 py-2.5 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[11px] text-gray-400">Phone</span>
                          <span className="text-[12px] font-medium text-gray-800">{ul.phoneNumber || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[11px] text-gray-400">Email</span>
                          <span className="text-[12px] font-medium text-gray-800 truncate max-w-[180px]">{ul.email || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-gray-400">Stage</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: stageColor.main }}>
                            {stageName}
                          </span>
                        </div>
                        {(ul.country || ul.state) && (
                          <div className="flex justify-between">
                            <span className="text-[11px] text-gray-400">Location</span>
                            <span className="text-[12px] font-medium text-gray-800">{[ul.state, ul.country].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {ul.language && (
                          <div className="flex justify-between">
                            <span className="text-[11px] text-gray-400">Language</span>
                            <span className="text-[12px] font-medium text-gray-800">{ul.language}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Admin */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#FFF7ED' }}>
                        <Users className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-xs font-bold text-orange-800">Assigned To</span>
                      </div>
                      <div className="px-3 py-2.5">
                        {assignedAdmin ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: '#F97316' }}>
                              {(assignedAdmin.name || assignedAdmin.userId || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-gray-800">{assignedAdmin.name || assignedAdmin.userId}</p>
                              {assignedAdmin.email && <p className="text-[11px] text-gray-400">{assignedAdmin.email}</p>}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] text-gray-400 italic">Not assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Connected With */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#F0FDF4' }}>
                        <Tag className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-bold text-green-800">Connected With</span>
                      </div>
                      <div className="px-3 py-2.5">
                        {(ul.labels?.length || 0) > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {ul.labels.map(label => (
                              <span key={label} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12px] text-gray-400 italic">No connections</p>
                        )}
                        {(ul.source || ul.workshopName) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            {ul.source && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Source: {ul.source}
                              </span>
                            )}
                            {ul.workshopName && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Workshop: {ul.workshopName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#FAF5FF' }}>
                        <History className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-bold text-purple-800">Stage History</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 ml-auto">
                          {stageHistory.length}
                        </span>
                      </div>
                      <div className="px-3 py-2.5">
                        {updatesLoading ? (
                          <div className="flex items-center justify-center py-3">
                            <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                          </div>
                        ) : stageHistory.length === 0 ? (
                          <p className="text-[12px] text-gray-400 italic text-center py-2">No stage changes yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {stageHistory.map((h) => {
                              const isNote = !h.fromStage && !h.toStage && h.note;
                              if (isNote) {
                                return (
                                  <div key={h._id} className="rounded-lg px-3 py-2 border border-indigo-50 bg-indigo-50/50">
                                    <p className="text-[11px] text-gray-700">{h.note}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-gray-400">{fmtDt(h.createdAt)}</span>
                                      {h.changedByName && <span className="text-[10px] text-gray-500 font-medium">by {h.changedByName}</span>}
                                    </div>
                                  </div>
                                );
                              }
                              const fromColor = getStageColor(stages.findIndex(s => s.key === h.fromStage));
                              const toColor = getStageColor(stages.findIndex(s => s.key === h.toStage));
                              return (
                                <div key={h._id} className="rounded-lg px-3 py-2 border border-purple-50" style={{ background: '#FDFAFF' }}>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {h.fromStage ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ background: fromColor.main }}>
                                        {getStageName(h.fromStage)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-medium">New</span>
                                    )}
                                    <span className="text-[10px] text-gray-400">→</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ background: toColor.main }}>
                                      {getStageName(h.toStage)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">{fmtDt(h.createdAt)}</span>
                                    {h.changedByName && <span className="text-[10px] text-gray-500 font-medium">by {h.changedByName}</span>}
                                  </div>
                                  {h.note && <p className="text-[10px] text-gray-500 mt-0.5 italic">{h.note}</p>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* CHAT TAB */}
                {updatesTab === 'chat' && (
                  <>
                    {metaMsgsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-green-500" />
                      </div>
                    ) : updatesMetaMsgs.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No WhatsApp messages found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {updatesMetaMsgs.map((msg) => {
                          const isInbound = msg.direction === 'inbound';
                          return (
                            <div key={msg._id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                              <div
                                className={`max-w-[80%] rounded-xl px-3 py-2 ${
                                  isInbound
                                    ? 'bg-white border border-gray-200 rounded-tl-sm'
                                    : 'bg-green-600 text-white rounded-tr-sm'
                                }`}
                              >
                                <p className={`text-[12px] leading-relaxed ${isInbound ? 'text-gray-800' : 'text-white'}`}>
                                  {msg.messageContent || (msg.templateName ? `📋 Template: ${msg.templateName}` : '(media/other)')}
                                </p>
                                <p className={`text-[9px] mt-1 text-right ${isInbound ? 'text-gray-400' : 'text-green-200'}`}>
                                  {fmtDt(msg.sentAt || msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* EMAIL TAB */}
                {updatesTab === 'email' && (
                  <>
                    {emailsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                      </div>
                    ) : updatesEmails.length === 0 ? (
                      <div className="text-center py-8">
                        <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No emails found</p>
                        {!ul.email && <p className="text-[11px] text-gray-300 mt-1">Lead has no email address</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {updatesEmails.map((eml) => (
                          <div key={eml._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-3 py-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-semibold text-gray-800 line-clamp-2 flex-1">{eml.subject || '(No Subject)'}</p>
                                <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  eml.status === 'sent' ? 'bg-green-100 text-green-700' :
                                  eml.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  eml.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{eml.status || 'unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-gray-400">{fmtDt(eml.createdAt)}</span>
                                {eml.source && <span className="text-[10px] text-gray-400">· {eml.source}</span>}
                              </div>
                              {eml.recipientEmail && (
                                <p className="text-[10px] text-gray-400 mt-0.5">To: {eml.recipientEmail}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* CALLS TAB */}
                {updatesTab === 'calls' && (
                  <>
                    {callsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
                      </div>
                    ) : updatesCalls.length === 0 ? (
                      <div className="text-center py-8">
                        <PhoneCall className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No AI calls yet</p>
                        <p className="text-[11px] text-gray-300 mt-1">Click Call on the lead card to start</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {updatesCalls.map(call => {
                          const purposeLabels: Record<string, string> = { follow_up: '📞 Follow-up', workshop_reminder: '📅 Workshop', collect_info: '📋 Collect Info', payment_reminder: '💳 Payment', welcome: '🙏 Welcome', custom: '✏️ Custom' };
                          const statusColors: Record<string, string> = { completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-600', no_answer: 'bg-orange-100 text-orange-600', busy: 'bg-orange-100 text-orange-600', in_progress: 'bg-indigo-100 text-indigo-600', ringing: 'bg-yellow-100 text-yellow-600', queued: 'bg-gray-100 text-gray-500' };
                          const dur = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '—';
                          return (
                            <div key={call._id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-semibold text-gray-800">{purposeLabels[call.purpose] || call.purpose}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[call.status] || 'bg-gray-100 text-gray-500'}`}>{call.status}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                <span>{fmtDt(call.createdAt)}</span>
                                <span>⏱ {dur}</span>
                                {call.sentiment && (
                                  <span>{call.sentiment === 'positive' ? '😊' : call.sentiment === 'negative' ? '😔' : '😐'} {call.sentiment}</span>
                                )}
                              </div>
                              {call.summary && <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-3">{call.summary}</p>}
                              {call.callEndedReason && call.status !== 'completed' && (
                                <p className="text-[10px] text-red-400 mt-0.5">{call.callEndedReason}</p>
                              )}
                              {call.crmUpdates?.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {call.crmUpdates.map((u: any, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-medium">
                                      ✅ {u.field}: {String(u.newValue).slice(0, 20)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Note Input + Footer */}
              <div className="border-t border-gray-100 bg-white">
                <div className="px-3 py-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={updateNote}
                    onChange={e => setUpdateNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addUpdateNote(); } }}
                    placeholder="Add a note or update..."
                    className="flex-1 text-[12px] px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition"
                  />
                  <button
                    onClick={addUpdateNote}
                    disabled={addingNote || !updateNote.trim()}
                    className="p-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
                  >
                    {addingNote ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center pb-2">
                  Last updated: {fmtDt(ul.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
