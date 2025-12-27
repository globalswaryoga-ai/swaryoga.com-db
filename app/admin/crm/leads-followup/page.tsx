'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Lead {
  _id: string;
  leadNumber?: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  labels: string[];
  workshopName?: string;
  source?: string;
  createdAt: string;
}

type ActionMode = 'notes' | 'whatsapp' | 'email' | 'sms' | 'todos' | 'reminder' | 'nextFollowup' | 'labels';

type HeaderPreview = {
  leadId: string;
  actionType: ActionMode;
  title: string;
  lines: string[];
  savedAtIso: string;
};

type ActivityItem =
  | {
      kind: 'note';
      _id: string;
      note: string;
      pinned?: boolean;
      metadata?: any;
      createdAt?: string;
      updatedAt?: string;
    }
  | {
      kind: 'followup';
      _id: string;
      title: string;
      description?: string;
      dueAt?: string;
      status?: string;
      createdAt?: string;
      updatedAt?: string;
      completedAt?: string;
      metadata?: any;
    };

function getActionLabel(mode: ActionMode): string {
  switch (mode) {
    case 'notes':
      return '📝 Notes';
    case 'whatsapp':
      return '💬 WhatsApp';
    case 'email':
      return '📧 Email';
    case 'sms':
      return '📱 SMS';
    case 'todos':
      return '✅ Todos';
    case 'reminder':
      return '🔔 Reminder';
    case 'nextFollowup':
      return '📅 Next Followup';
    case 'labels':
      return '🏷️ Labels';
    default:
      return String(mode);
  }
}

function truncateText(input: unknown, max = 110): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function parseTodosText(input: string): Array<{ text: string; dueDate?: string }> {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Supported formats per line:
  // - Task text
  // - Task text | YYYY-MM-DD
  // - Task text | 2025-12-31T18:30
  return lines
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const text = parts[0] || '';
      const datePart = parts[1];

      if (!text) return null;
      if (!datePart) return { text };

      const d = new Date(datePart);
      if (Number.isNaN(d.getTime())) return { text };
      return { text, dueDate: d.toISOString() };
    })
    .filter((x): x is { text: string; dueDate?: string } => Boolean(x));
}

const getDefaultDatetime = (): string => {
  const now = new Date();
  now.setHours(11, 0, 0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EMOJI_SETS = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😌', '😉', '🥰', '😍', '😘', '😗', '😚', '😙'],
  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜'],
  symbols: ['❤️', '💔', '💕', '💖', '💗', '💓', '💞', '✨', '⭐', '🌟', '💫', '🔥', '💯', '✅', '❌', '🚀', '💡', '🎯', '📌'],
};

const WHATSAPP_TEMPLATES = [
  'Hi {{name}}, how are you?',
  'Thank you for your interest in our workshop!',
  'Please confirm your participation for {{date}}',
  'Reminder: Your session is coming up on {{date}}',
  'We would love to have you join us!',
];

export default function LeadsFollowupPage() {
  const router = useRouter();
  const token = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [actionMode, setActionMode] = useState<ActionMode>('notes');
  const [message, setMessage] = useState('');
  const [followupStatus, setFollowupStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [todos, setTodos] = useState('');
  const [reminder, setReminder] = useState('');
  const [reminderDate, setReminderDate] = useState(getDefaultDatetime());
  const [nextFollowupDate, setNextFollowupDate] = useState(getDefaultDatetime());
  const [nextFollowupDetails, setNextFollowupDetails] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);

  // Header-side preview (cart-like): show what you're typing + what you last saved.
  const [lastSavedPreview, setLastSavedPreview] = useState<HeaderPreview | null>(null);

  const [activityLoading, setActivityLoading] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showHeaderPreview, setShowHeaderPreview] = useState(false);
  const [showSavedItems, setShowSavedItems] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editStatus, setEditStatus] = useState<'open' | 'done' | string>('open');

  // WhatsApp specific states
  const [whatsappType, setWhatsappType] = useState<'text' | 'image' | 'video' | 'document'>('text');
  const [whatsappScheduled, setWhatsappScheduled] = useState(false);
  const [whatsappScheduleDate, setWhatsappScheduleDate] = useState(getDefaultDatetime());
  const [whatsappDelayed, setWhatsappDelayed] = useState(false);
  const [whatsappDelayAmount, setWhatsappDelayAmount] = useState('5');
  const [whatsappDelayUnit, setWhatsappDelayUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [whatsappQuickReplies, setWhatsappQuickReplies] = useState<string[]>([]);
  const [whatsappNewQuickReply, setWhatsappNewQuickReply] = useState('');
  const [whatsappMediaFile, setWhatsappMediaFile] = useState<File | null>(null);
  const [whatsappShowEmoji, setWhatsappShowEmoji] = useState(false);
  const [whatsappBroadcast, setWhatsappBroadcast] = useState(false);
  const [whatsappBroadcastLabel, setWhatsappBroadcastLabel] = useState('');

  // Fetch all leads
  useEffect(() => {
    const fetchAllLeads = async () => {
      if (!token) return;

      try {
        setLoadingLeads(true);
        const response = await fetch('/api/admin/crm/leads?limit=1000', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch leads');

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.leads)) {
          setAllLeads(data.data.leads);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchAllLeads();
  }, [token]);

  // Filter leads
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads(allLeads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allLeads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.phoneNumber.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.leadNumber?.toLowerCase().includes(query)
    );
    setFilteredLeads(filtered);
  }, [searchQuery, allLeads]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDropdown(false);
    setSearchQuery('');
    setMessage('');
    setFollowupStatus('pending');
    setTodos('');
    setReminder('');
    setReminderDate(getDefaultDatetime());
    setNextFollowupDate(getDefaultDatetime());
    setNextFollowupDetails('');
    setSelectedLabels([]);
    setNewLabel('');
    setError(null); // Clear error when lead is selected
    // Reset WhatsApp states
    setWhatsappType('text');
    setWhatsappScheduled(false);
    setWhatsappScheduleDate(getDefaultDatetime());
    setWhatsappDelayed(false);
    setWhatsappDelayAmount('5');
    setWhatsappDelayUnit('minutes');
    setWhatsappTemplate('');
    setWhatsappQuickReplies([]);
    setWhatsappNewQuickReply('');
    setWhatsappMediaFile(null);
    setWhatsappBroadcast(false);
    setWhatsappBroadcastLabel('');

    // Reset header preview when switching leads.
    setLastSavedPreview(null);
    setActivityItems([]);
    setActivityError(null);
    setEditingKey(null);
    setShowHeaderPreview(false);
    setShowSavedItems(true);
  };

  const fetchLeadActivity = async (leadId: string) => {
    if (!token) return;
    setActivityError(null);
    setActivityLoading(true);
    try {
      const [notesRes, followupsRes] = await Promise.all([
        fetch(`/api/admin/crm/leads/${leadId}/notes?limit=20`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/admin/crm/leads/${leadId}/followups?limit=20&status=all`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      const notesJson = await notesRes.json().catch(() => null);
      const followupsJson = await followupsRes.json().catch(() => null);

      if (!notesRes.ok) throw new Error(notesJson?.error || 'Failed to load notes');
      if (!followupsRes.ok) throw new Error(followupsJson?.error || 'Failed to load followups');

      const notes: ActivityItem[] = Array.isArray(notesJson?.data?.notes)
        ? notesJson.data.notes.map((n: any) => ({
            kind: 'note',
            _id: String(n._id),
            note: String(n.note || ''),
            pinned: Boolean(n.pinned),
            metadata: n.metadata,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          }))
        : [];

      const followups: ActivityItem[] = Array.isArray(followupsJson?.data?.followups)
        ? followupsJson.data.followups.map((f: any) => ({
            kind: 'followup',
            _id: String(f._id),
            title: String(f.title || 'Follow up'),
            description: typeof f.description === 'string' ? f.description : undefined,
            dueAt: f.dueAt,
            status: f.status,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
            completedAt: f.completedAt,
            metadata: f.metadata,
          }))
        : [];

      const combined = [...notes, ...followups].sort((a, b) => {
        const aTime = new Date((a as any).createdAt || (a.kind === 'followup' ? (a as any).dueAt : undefined) || 0).getTime();
        const bTime = new Date((b as any).createdAt || (b.kind === 'followup' ? (b as any).dueAt : undefined) || 0).getTime();
        return bTime - aTime;
      });

      setActivityItems(combined.slice(0, 30));
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load saved items');
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !selectedLead?._id) return;
    fetchLeadActivity(selectedLead._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedLead?._id]);

  const startEditItem = (item: ActivityItem) => {
    const key = `${item.kind}:${item._id}`;
    setEditingKey(key);
    if (item.kind === 'note') {
      setEditText(item.note || '');
      setEditTitle('');
      setEditDueAt('');
      setEditStatus('open');
      return;
    }

    setEditTitle(item.title || '');
    setEditText(item.description || '');
    setEditDueAt(item.dueAt ? String(item.dueAt).slice(0, 16) : '');
    setEditStatus(item.status || 'open');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditText('');
    setEditTitle('');
    setEditDueAt('');
    setEditStatus('open');
  };

  const saveEdit = async (item: ActivityItem) => {
    if (!token || !selectedLead?._id) return;
    setActivityError(null);
    setActivityLoading(true);
    try {
      if (item.kind === 'note') {
        const res = await fetch(`/api/admin/crm/leads/${selectedLead._id}/notes`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ noteId: item._id, note: editText }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to update note');
      } else {
        const dueAt = editDueAt ? new Date(editDueAt).toISOString() : item.dueAt;
        const res = await fetch(`/api/admin/crm/leads/${selectedLead._id}/followups`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            followUpId: item._id,
            title: editTitle,
            description: editText,
            dueAt,
            status: editStatus,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to update followup');
      }

      cancelEdit();
      await fetchLeadActivity(selectedLead._id);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActivityLoading(false);
    }
  };

  const deleteItem = async (item: ActivityItem) => {
    if (!token || !selectedLead?._id) return;
    const ok = window.confirm('Delete this item? This cannot be undone.');
    if (!ok) return;

    setActivityError(null);
    setActivityLoading(true);
    try {
      const url =
        item.kind === 'note'
          ? `/api/admin/crm/leads/${selectedLead._id}/notes?noteId=${encodeURIComponent(item._id)}`
          : `/api/admin/crm/leads/${selectedLead._id}/followups?followUpId=${encodeURIComponent(item._id)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to delete');

      if (editingKey === `${item.kind}:${item._id}`) cancelEdit();
      await fetchLeadActivity(selectedLead._id);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActivityLoading(false);
    }
  };

  const draftPreviewLines = (() => {
    if (!selectedLead) return [] as string[];

    switch (actionMode) {
      case 'notes':
      case 'whatsapp':
      case 'email':
      case 'sms': {
        const t = truncateText(message);
        return t ? [t] : [];
      }

      case 'todos': {
        const parsed = parseTodosText(todos);
        if (!parsed.length) return [];
        const count = parsed.length;
        const sample = parsed.slice(0, 3).map((t) => truncateText(t.text, 80));
        return [`${count} item(s)`, ...sample.map((s) => `• ${s}`)];
      }

      case 'reminder': {
        const r = truncateText(reminder);
        const when = reminderDate ? `⏰ ${reminderDate}` : '';
        return [r, when].filter(Boolean);
      }

      case 'nextFollowup': {
        const when = nextFollowupDate ? `📅 ${nextFollowupDate}` : '';
        const details = truncateText(nextFollowupDetails);
        return [when, details].filter(Boolean);
      }

      case 'labels': {
        if (!selectedLabels.length) return [];
        return [`${selectedLabels.length} label(s)`, truncateText(selectedLabels.join(', '), 120)];
      }

      default:
        return [];
    }
  })();

  const handleSaveFollowup = async () => {
    setError(null); // Clear any previous errors
    
    if (!selectedLead) {
      setError('Please select a lead first');
      return;
    }

    // Validate based on action mode
    let hasContent = false;
    
    switch (actionMode) {
      case 'notes':
        hasContent = message.trim().length > 0;
        break;
      case 'whatsapp':
        hasContent = message.trim().length > 0;
        break;
      case 'email':
        hasContent = message.trim().length > 0; // TODO: implement email
        break;
      case 'sms':
        hasContent = message.trim().length > 0; // TODO: implement SMS
        break;
      case 'todos':
        hasContent = todos.trim().length > 0;
        break;
      case 'reminder':
        hasContent = reminder.trim().length > 0 && reminderDate !== '';
        break;
      case 'nextFollowup':
        hasContent = nextFollowupDate !== '' && nextFollowupDetails.trim().length > 0;
        break;
      case 'labels':
        hasContent = selectedLabels.length > 0;
        break;
      default:
        hasContent = false;
    }

    if (!hasContent) {
      setError(`Please add content for ${actionMode}`);
      return;
    }

    // Build a preview snapshot now (before we clear inputs on success).
    const previewBeforeSave: HeaderPreview = {
      leadId: selectedLead._id,
      actionType: actionMode,
      title: getActionLabel(actionMode),
      lines: draftPreviewLines.length ? draftPreviewLines : ['(no preview)'],
      savedAtIso: new Date().toISOString(),
    };

    setLoading(true);
    try {
      // Build payload based on action type
      const payload: any = {
        leadId: selectedLead._id,
        actionType: actionMode,
        lastUpdated: new Date().toISOString(),
      };

      switch (actionMode) {
        case 'notes':
          payload.followupNotes = message;
          break;
        case 'whatsapp':
          payload.followupNotes = message;
          payload.whatsappType = whatsappType;
          payload.whatsappScheduled = whatsappScheduled;
          payload.whatsappScheduleDate = whatsappScheduleDate;
          payload.whatsappDelayed = whatsappDelayed;
          payload.whatsappDelayAmount = whatsappDelayAmount;
          payload.whatsappDelayUnit = whatsappDelayUnit;
          payload.whatsappTemplate = whatsappTemplate;
          payload.whatsappBroadcast = whatsappBroadcast;
          payload.whatsappBroadcastLabel = whatsappBroadcastLabel;
          break;
        case 'email':
          payload.followupNotes = message;
          break;
        case 'sms':
          payload.followupNotes = message;
          break;
        case 'todos':
          payload.todos = parseTodosText(todos);
          break;
        case 'reminder':
          payload.followupNotes = reminder;
          payload.reminderDate = reminderDate;
          break;
        case 'nextFollowup':
          payload.nextFollowupDate = nextFollowupDate;
          payload.nextFollowupDetails = nextFollowupDetails;
          break;
        case 'labels':
          payload.selectedLabels = selectedLabels;
          break;
      }

      const response = await fetch('/api/admin/crm/leads/followup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || 'Failed to save');
      }

      if (!responseData.success) {
        throw new Error(responseData?.message || 'Save failed');
      }

      setSuccess('Saved successfully!');

      // Show last-saved preview in the header (cart-like).
      setLastSavedPreview(previewBeforeSave);

      // Refresh saved items list so the new record shows up immediately.
      await fetchLeadActivity(selectedLead._id);

      setMessage('');
      setReminder('');
      setFollowupStatus('pending');
      setNextFollowupDate('');
      setNextFollowupDetails('');
      setTodos('');
      setSelectedLabels([]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-red-50 border border-red-300 rounded-lg p-8 text-red-700">
          <p className="font-semibold">Authentication required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                title="Back to CRM"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Lead Followup</h1>
                <p className="text-sm text-slate-500 mt-1">Manage conversations and followups</p>
              </div>
            </div>

            {selectedLead && (
              <div className="flex flex-col items-end gap-2 max-w-md">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{selectedLead.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{selectedLead.phoneNumber}</p>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowHeaderPreview((v) => !v)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                      aria-expanded={showHeaderPreview}
                    >
                      {showHeaderPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>
                </div>

                {/* Header-side preview (collapsible) */}
                {showHeaderPreview && (
                  <div className="w-[22rem] space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-700">Preview</p>
                        <p className="text-[11px] text-slate-500 truncate">{getActionLabel(actionMode)}</p>
                      </div>
                      {draftPreviewLines.length ? (
                        <div className="mt-2 space-y-1">
                          {draftPreviewLines.slice(0, 4).map((line, idx) => (
                            <p key={idx} className="text-xs text-slate-700 leading-snug">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">Start typing to see a preview here…</p>
                      )}
                    </div>

                    {lastSavedPreview && lastSavedPreview.leadId === selectedLead._id && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold text-emerald-800">Last saved</p>
                          <p className="text-[11px] text-emerald-700 truncate">{lastSavedPreview.title}</p>
                        </div>
                        <div className="mt-2 space-y-1">
                          {lastSavedPreview.lines.slice(0, 4).map((line, idx) => (
                            <p key={idx} className="text-xs text-emerald-800 leading-snug">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {selectedLead && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActionMode('notes')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'notes'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  📝 Notes
                </button>
                <button
                  onClick={() => setActionMode('whatsapp')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'whatsapp'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                  }`}
                >
                  💬 WhatsApp
                </button>
                <button
                  onClick={() => setActionMode('email')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  📧 Email
                </button>
                <button
                  onClick={() => setActionMode('sms')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'sms'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                  }`}
                >
                  📱 SMS
                </button>
                <button
                  onClick={() => setActionMode('todos')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'todos'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                  }`}
                >
                  ✅ Todos
                </button>
                <button
                  onClick={() => setActionMode('reminder')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'reminder'
                      ? 'bg-pink-600 text-white'
                      : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                  }`}
                >
                  🔔 Reminder
                </button>
                <button
                  onClick={() => setActionMode('nextFollowup')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'nextFollowup'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
                  }`}
                >
                  📅 Next Followup
                </button>
                <button
                  onClick={() => setActionMode('labels')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                    actionMode === 'labels'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                  }`}
                >
                  🏷️ Labels
                </button>
              </div>

              {/* Saved items cards (edit/delete) */}
              <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Saved items</p>
                    <p className="text-xs text-slate-500">Your recent notes & followups for this lead (edit/delete)</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => {
                        // Per request: refresh should always open the section
                        setShowSavedItems(true);
                        if (selectedLead?._id) fetchLeadActivity(selectedLead._id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                      disabled={activityLoading}
                    >
                      {activityLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSavedItems((v) => !v)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                      aria-expanded={showSavedItems}
                      title={showSavedItems ? 'Hide saved items' : 'Show saved items'}
                    >
                      {showSavedItems ? '🙈 Hide' : '👁️ Show'}
                    </button>
                  </div>
                </div>

                {activityError && (
                  <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {activityError}
                  </div>
                )}

                {!showSavedItems ? (
                  <div className="text-xs text-slate-500 px-2 py-2">
                    Saved items hidden. Click <span className="font-semibold">👁️ Show</span> to view again.
                  </div>
                ) : activityItems.length === 0 ? (
                  <div className="text-xs text-slate-500 px-2 py-2">No saved items yet for this lead.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {activityItems.map((item) => {
                      const key = `${item.kind}:${item._id}`;
                      const isEditing = editingKey === key;
                      const header =
                        item.kind === 'note'
                          ? (item.note?.startsWith('[WhatsApp]')
                              ? '💬 WhatsApp'
                              : item.note?.startsWith('[Email]')
                                ? '📧 Email'
                                : item.note?.startsWith('[SMS]')
                                  ? '📱 SMS'
                                  : '📝 Note')
                          : (item.metadata?.actionType === 'todo' ? '✅ Todo' : item.metadata?.actionType === 'reminder' ? '🔔 Reminder' : '📅 Followup');

                      const when =
                        item.kind === 'followup'
                          ? item.dueAt
                            ? new Date(item.dueAt).toLocaleString()
                            : item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : ''
                          : item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : '';

                      const summary =
                        item.kind === 'note'
                          ? truncateText(item.note, 120)
                          : truncateText(item.description || item.title, 120);

                      return (
                        <div
                          key={key}
                          className="min-w-[18rem] max-w-[18rem] bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{header}</p>
                              {when && <p className="text-[11px] text-slate-500 mt-0.5">{when}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => (isEditing ? cancelEdit() : startEditItem(item))}
                                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold"
                              >
                                {isEditing ? 'Close' : 'Edit'}
                              </button>
                              <button
                                onClick={() => deleteItem(item)}
                                className="px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {!isEditing ? (
                            <p className="text-xs text-slate-700 mt-2 leading-snug whitespace-pre-wrap">{summary}</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {item.kind === 'followup' && (
                                <>
                                  <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                                    placeholder="Title"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="datetime-local"
                                      value={editDueAt}
                                      onChange={(e) => setEditDueAt(e.target.value)}
                                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                                    />
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value)}
                                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                                    >
                                      <option value="open">open</option>
                                      <option value="done">done</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs min-h-[70px]"
                                placeholder={item.kind === 'note' ? 'Edit note…' : 'Edit description…'}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(item)}
                                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                  disabled={activityLoading}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="flex-1 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border-b border-green-300 px-8 py-3 text-green-700 flex justify-between items-center">
          <span className="font-medium">✅ {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-300 px-8 py-3 text-red-700 flex justify-between items-center">
          <span className="font-medium">❌ {error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Select Lead</h2>

              {/* Search */}
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowLeadDropdown(true)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                />

                {/* Dropdown */}
                {showLeadDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {loadingLeads ? (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">Loading leads...</div>
                    ) : filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                        <button
                          key={lead._id}
                          onClick={() => handleSelectLead(lead)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-slate-900 text-sm">{lead.name}</div>
                          <div className="text-xs text-slate-600">{lead.phoneNumber}</div>
                          <div className="text-xs text-slate-500">{lead.email}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">No leads found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Lead Info */}
            {selectedLead && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase">Selected Lead</p>
                  <p className="text-lg font-bold text-slate-900">{selectedLead.name}</p>
                </div>

                <div className="space-y-2 text-sm border-t border-slate-200 pt-3">
                  <div>
                    <span className="font-semibold text-slate-700">ID:</span>
                    <p className="text-slate-600">{selectedLead.leadNumber || selectedLead._id.slice(-8)}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Phone:</span>
                    <p className="text-slate-600">{selectedLead.phoneNumber}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Email:</span>
                    <p className="text-slate-600 truncate text-xs">{selectedLead.email}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Status:</span>
                    <p className="text-slate-600 capitalize">{selectedLead.status}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-full px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors text-sm"
                >
                  Change Lead
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Chat Box */}
        <div className="flex-1 overflow-y-auto">
          {!selectedLead ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-2xl font-bold text-slate-900 mb-2">Select a Lead</p>
                <p className="text-slate-600">Choose a lead from the sidebar to get started</p>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-3xl mx-auto">
                {/* Header */}
                <div className="border-b border-slate-200 px-8 py-6">
                  {actionMode === 'notes' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">📝 Followup Notes</h2>
                      <p className="text-slate-600 text-sm mt-1">Record conversation details and next steps</p>
                    </div>
                  )}
                  {actionMode === 'whatsapp' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">💬 WhatsApp</h2>
                      <p className="text-slate-600 text-sm mt-1">Send message to {selectedLead.phoneNumber}</p>
                    </div>
                  )}
                  {actionMode === 'email' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">📧 Email</h2>
                      <p className="text-slate-600 text-sm mt-1">Send email to {selectedLead.email}</p>
                    </div>
                  )}
                  {actionMode === 'sms' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">📱 SMS</h2>
                      <p className="text-slate-600 text-sm mt-1">Send text to {selectedLead.phoneNumber}</p>
                    </div>
                  )}
                  {actionMode === 'todos' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">✅ Todos</h2>
                      <p className="text-slate-600 text-sm mt-1">Add tasks for this lead</p>
                    </div>
                  )}
                  {actionMode === 'reminder' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">🔔 Reminder</h2>
                      <p className="text-slate-600 text-sm mt-1">Set a reminder for follow-up</p>
                    </div>
                  )}
                  {actionMode === 'nextFollowup' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">📅 Next Followup Details</h2>
                      <p className="text-slate-600 text-sm mt-1">Plan the next interaction with this lead</p>
                    </div>
                  )}
                  {actionMode === 'labels' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">🏷️ Labels</h2>
                      <p className="text-slate-600 text-sm mt-1">Organize leads with labels</p>
                    </div>
                  )}
                </div>

                {/* Form Content */}
                <div className="px-8 py-8 space-y-6">
                  {/* Notes Form */}
                  {actionMode === 'notes' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Followup Notes</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Write detailed notes about the conversation, outcomes, and next steps..."
                          className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                          rows={10}
                        />
                        <div className="mt-2 text-xs text-slate-500 text-right">{message.length} characters</div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Status</label>
                        <select
                          value={followupStatus}
                          onChange={(e) => setFollowupStatus(e.target.value as any)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="in-progress">🔄 In Progress</option>
                          <option value="completed">✅ Completed</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* WhatsApp Form */}
                  {actionMode === 'whatsapp' && (
                    <div className="space-y-6">
                      {/* Message Type Tabs */}
                      <div className="flex gap-2 flex-wrap border-b border-slate-200 pb-4">
                        <button
                          onClick={() => setWhatsappType('text')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                            whatsappType === 'text'
                              ? 'bg-green-600 text-white'
                              : 'bg-green-50 hover:bg-green-100 text-green-700'
                          }`}
                        >
                          📝 Text
                        </button>
                        <button
                          onClick={() => setWhatsappType('image')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                            whatsappType === 'image'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                          }`}
                        >
                          🖼️ Image
                        </button>
                        <button
                          onClick={() => setWhatsappType('video')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                            whatsappType === 'video'
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                          }`}
                        >
                          🎥 Video
                        </button>
                        <button
                          onClick={() => setWhatsappType('document')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                            whatsappType === 'document'
                              ? 'bg-orange-600 text-white'
                              : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                          }`}
                        >
                          📄 Document
                        </button>
                      </div>

                      {/* Broadcast Message */}
                      <div className="border-b border-slate-200 pb-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={whatsappBroadcast}
                            onChange={(e) => setWhatsappBroadcast(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-slate-900">📢 Broadcast Message</span>
                        </label>
                        {whatsappBroadcast && (
                          <div className="mt-3">
                            <label className="block text-xs font-semibold text-slate-700 mb-2">Send to leads with label:</label>
                            <input
                              type="text"
                              value={whatsappBroadcastLabel}
                              onChange={(e) => setWhatsappBroadcastLabel(e.target.value)}
                              placeholder="e.g., interested, yoga-students, workshops"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1">💡 Leave empty to send to all leads</p>
                          </div>
                        )}
                      </div>

                      {/* Template Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Template (Optional)</label>
                        <select
                          value={whatsappTemplate}
                          onChange={(e) => {
                            setWhatsappTemplate(e.target.value);
                            if (e.target.value) setMessage(e.target.value);
                          }}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                        >
                          <option value="">-- Select a template --</option>
                          {WHATSAPP_TEMPLATES.map((tmpl, idx) => (
                            <option key={idx} value={tmpl}>
                              {tmpl}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Message Input with Formatting */}
                      {whatsappType === 'text' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-3">Message</label>
                          
                          {/* Formatting Toolbar */}
                          <div className="flex gap-2 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex-wrap">
                            <button
                              onClick={() => setMessage(message + '*bold*')}
                              title="Bold"
                              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                            >
                              B
                            </button>
                            <button
                              onClick={() => setMessage(message + '_italic_')}
                              title="Italic"
                              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 italic text-sm"
                            >
                              I
                            </button>
                            <button
                              onClick={() => setMessage(message + '~strikethrough~')}
                              title="Strikethrough"
                              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 line-through text-sm"
                            >
                              S
                            </button>
                            <button
                              onClick={() => setMessage(message + '```code```')}
                              title="Code"
                              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 font-mono text-sm"
                            >
                              {'<>'}
                            </button>

                            <div className="flex-1"></div>

                            <div className="relative">
                              <button
                                onClick={() => setWhatsappShowEmoji(!whatsappShowEmoji)}
                                title="Emoji"
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-lg"
                              >
                                😊
                              </button>

                              {whatsappShowEmoji && (
                                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 p-3 max-w-xs">
                                  <div className="grid grid-cols-6 gap-2 mb-3">
                                    {EMOJI_SETS.smileys.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          setMessage(message + emoji);
                                          setWhatsappShowEmoji(false);
                                        }}
                                        className="text-xl hover:bg-slate-100 p-1 rounded"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="border-t border-slate-200 pt-3">
                                    <p className="text-xs font-semibold text-slate-600 mb-2">Symbols</p>
                                    <div className="grid grid-cols-6 gap-2">
                                      {EMOJI_SETS.symbols.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            setMessage(message + emoji);
                                            setWhatsappShowEmoji(false);
                                          }}
                                          className="text-lg hover:bg-slate-100 p-1 rounded"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-200 pt-3 mt-3">
                                    <p className="text-xs font-semibold text-slate-600 mb-2">Gestures</p>
                                    <div className="grid grid-cols-6 gap-2">
                                      {EMOJI_SETS.gestures.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            setMessage(message + emoji);
                                            setWhatsappShowEmoji(false);
                                          }}
                                          className="text-lg hover:bg-slate-100 p-1 rounded"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here... (*bold* _italic_ ~strikethrough~ ```code```)"
                            className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                            rows={8}
                          />
                          <div className="mt-2 text-xs text-slate-500 text-right">{message.length} characters</div>
                        </div>
                      )}

                      {/* Media Upload */}
                      {(whatsappType === 'image' || whatsappType === 'video' || whatsappType === 'document') && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-3">
                            {whatsappType === 'image' && '📷 Upload Image'}
                            {whatsappType === 'video' && '🎬 Upload Video'}
                            {whatsappType === 'document' && '📎 Upload Document'}
                          </label>
                          <input
                            type="file"
                            onChange={(e) => setWhatsappMediaFile(e.target.files?.[0] || null)}
                            accept={
                              whatsappType === 'image'
                                ? 'image/*'
                                : whatsappType === 'video'
                                ? 'video/*'
                                : '*/*'
                            }
                            className="w-full px-4 py-3 border border-dashed border-slate-300 rounded-lg hover:border-slate-900 cursor-pointer text-sm"
                          />
                          {whatsappMediaFile && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                              ✅ File selected: {whatsappMediaFile.name}
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-3 mt-4">Caption (Optional)</label>
                            <textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Add a caption for your media..."
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                              rows={4}
                            />
                          </div>
                        </div>
                      )}

                      {/* Schedule Message */}
                      <div className="border-t border-slate-200 pt-4">
                        <label className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            checked={whatsappScheduled}
                            onChange={(e) => setWhatsappScheduled(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-slate-900">📅 Schedule Message</span>
                        </label>
                        {whatsappScheduled && (
                          <input
                            type="datetime-local"
                            value={whatsappScheduleDate}
                            onChange={(e) => setWhatsappScheduleDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                          />
                        )}
                      </div>

                      {/* Delay Message */}
                      <div>
                        <label className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            checked={whatsappDelayed}
                            onChange={(e) => setWhatsappDelayed(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-slate-900">⏱️ Delay Message</span>
                        </label>
                        {whatsappDelayed && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={whatsappDelayAmount}
                              onChange={(e) => setWhatsappDelayAmount(e.target.value)}
                              min="1"
                              className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                            />
                            <select
                              value={whatsappDelayUnit}
                              onChange={(e) => setWhatsappDelayUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Quick Replies */}
                      <div className="border-t border-slate-200 pt-4">
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Quick Replies (Optional)</label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={whatsappNewQuickReply}
                            onChange={(e) => setWhatsappNewQuickReply(e.target.value)}
                            placeholder="Enter quick reply..."
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && whatsappNewQuickReply.trim()) {
                                setWhatsappQuickReplies([...whatsappQuickReplies, whatsappNewQuickReply.trim()]);
                                setWhatsappNewQuickReply('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (whatsappNewQuickReply.trim()) {
                                setWhatsappQuickReplies([...whatsappQuickReplies, whatsappNewQuickReply.trim()]);
                                setWhatsappNewQuickReply('');
                              }
                            }}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                        {whatsappQuickReplies.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {whatsappQuickReplies.map((reply, idx) => (
                              <div
                                key={idx}
                                className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                              >
                                {reply}
                                <button
                                  onClick={() => setWhatsappQuickReplies(whatsappQuickReplies.filter((_, i) => i !== idx))}
                                  className="text-green-600 hover:text-green-800 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email Form */}
                  {actionMode === 'email' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">Email Message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your email message here..."
                        className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                        rows={10}
                      />
                      <div className="mt-2 text-xs text-slate-500 text-right">{message.length} characters</div>
                    </div>
                  )}

                  {/* SMS Form */}
                  {actionMode === 'sms' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">SMS Message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your SMS message here..."
                        className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                        rows={6}
                      />
                      <div className="mt-2 text-xs text-slate-500 text-right">{message.length} characters (SMS limit: 160)</div>
                    </div>
                  )}

                  {/* Todos Form */}
                  {actionMode === 'todos' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">Add Todos</label>
                      <textarea
                        value={todos}
                        onChange={(e) => setTodos(e.target.value)}
                        placeholder="Add tasks for this lead (one per line). Optional date: Task | 2025-12-31\n\nExamples:\n- Send proposal\n- Follow up | 2025-12-31\n- Schedule demo | 2025-12-31T18:30"
                        className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                        rows={10}
                      />
                      <div className="mt-2 text-xs text-slate-500 text-right">{todos.length} characters</div>
                    </div>
                  )}

                  {/* Reminder Form */}
                  {actionMode === 'reminder' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Reminder Message</label>
                        <textarea
                          value={reminder}
                          onChange={(e) => setReminder(e.target.value)}
                          placeholder="What should you be reminded about?"
                          className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                          rows={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Reminder Date & Time</label>
                        <input
                          type="datetime-local"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* Next Followup Form */}
                  {actionMode === 'nextFollowup' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Scheduled Date & Time</label>
                        <input
                          type="datetime-local"
                          value={nextFollowupDate}
                          onChange={(e) => setNextFollowupDate(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Followup Details & Objectives</label>
                        <textarea
                          value={nextFollowupDetails}
                          onChange={(e) => setNextFollowupDetails(e.target.value)}
                          placeholder="What will you discuss in the next followup? What are the goals?"
                          className="w-full px-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none text-sm"
                          rows={8}
                        />
                      </div>
                    </>
                  )}

                  {/* Labels Form */}
                  {actionMode === 'labels' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">Add New Label</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Enter label name..."
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newLabel.trim()) {
                                setSelectedLabels([...selectedLabels, newLabel.trim()]);
                                setNewLabel('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newLabel.trim()) {
                                setSelectedLabels([...selectedLabels, newLabel.trim()]);
                                setNewLabel('');
                              }
                            }}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {selectedLabels.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-3">Selected Labels</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedLabels.map((label, idx) => (
                              <div
                                key={idx}
                                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                              >
                                {label}
                                <button
                                  onClick={() => setSelectedLabels(selectedLabels.filter((_, i) => i !== idx))}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-slate-200">
                    <button
                      onClick={handleSaveFollowup}
                      disabled={
                        loading ||
                        (actionMode === 'notes' && !message.trim()) ||
                        (actionMode === 'whatsapp' && !message.trim()) ||
                        (actionMode === 'email' && !message.trim()) ||
                        (actionMode === 'sms' && !message.trim()) ||
                        (actionMode === 'todos' && !todos.trim()) ||
                        (actionMode === 'reminder' && (!reminder.trim() || !reminderDate)) ||
                        (actionMode === 'nextFollowup' && (!nextFollowupDate || !nextFollowupDetails.trim())) ||
                        (actionMode === 'labels' && selectedLabels.length === 0)
                      }
                      className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                    >
                      {loading ? '⏳ Saving...' : actionMode === 'notes' ? '💾 Save Notes' : actionMode === 'todos' ? '💾 Save Todos' : actionMode === 'reminder' ? '⏰ Set Reminder' : actionMode === 'nextFollowup' ? '📅 Schedule' : actionMode === 'labels' ? '🏷️ Apply Labels' : '📤 Send'}
                    </button>
                    <button
                      onClick={() => {
                        setMessage('');
                        setTodos('');
                        setReminder('');
                        setReminderDate('');
                        setNextFollowupDate('');
                        setNextFollowupDetails('');
                        setNewLabel('');
                      }}
                      className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-bold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
