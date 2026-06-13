'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, Search, Users, Loader2, CheckCircle2, Clock, Calendar,
  Trash2, Play, Pause, RefreshCw, AlertCircle, MessageSquare, ListChecks, Pencil, X,
} from 'lucide-react';

type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
};

type Schedule = {
  _id: string;
  name: string;
  messageText: string;
  recipientChatIds: string[];
  groupIds: string[];
  startTime: string;
  endTime: string;
  frequency: string;
  customScheduleDates?: string[];
  status: string;
  isActive: boolean;
  lastError?: string;
  lastRunDate?: string;
  stats?: { totalSent?: number; totalFailed?: number; totalAttempted?: number };
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'bg-gray-100 text-gray-600' },
  scheduled:   { label: 'Scheduled',   color: 'bg-blue-100 text-blue-700' },
  'in-progress': { label: 'In progress', color: 'bg-yellow-100 text-yellow-700' },
  paused:      { label: 'Paused',      color: 'bg-orange-100 text-orange-700' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  failed:      { label: 'Failed',      color: 'bg-red-100 text-red-700' },
};

// "18:00" + 30 -> "18:30"
function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + mins + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Generate `count` consecutive date strings (YYYY-MM-DD) starting from `start`
function genDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const [y, m, d] = start.split('-').map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1);
  for (let i = 0; i < count; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    dates.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

function fmtDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// IST calendar-date key (YYYY-MM-DD) for a Date/ISO string, regardless of UTC offset
function toIstDateKey(d: string | Date): string {
  const ist = new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, (am || 1) - 1, ad || 1);
  const db = new Date(by, (bm || 1) - 1, bd || 1);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function QRGroupSchedulerPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // ── Groups (from bridge) ──
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [groupSearch, setGroupSearch] = useState('');

  // ── Schedules ──
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Form state ──
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState('');
  const [sendTime, setSendTime] = useState('18:00');
  const [startDate, setStartDate] = useState(tomorrowDateStr());
  const [numDays, setNumDays] = useState(15);
  // Dates within the block (dateList) that the admin has unchecked. Anything
  // in dateList NOT in this set is considered selected/checked.
  const [unselectedDates, setUnselectedDates] = useState<Set<string>>(new Set());
  const [scheduleName, setScheduleName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Load groups from QR Bridge
  const loadChats = useCallback(async () => {
    if (!token) return;
    setChatsLoading(true);
    try {
      const res = await crmFetch('/api/admin/crm/whatsapp/qr-bridge', { params: { path: '/chats' } });
      const arr = Array.isArray(res) ? res : (Array.isArray(res?.chats) ? res.chats : []);
      const mapped: Chat[] = arr.map((c: any) => ({
        id: c.id,
        name: c.name || c.id,
        isGroup: c.id?.endsWith?.('@g.us') || c.isGroup === true || c.isGroupChat === true || c.groupMetadata !== undefined,
      }));
      setChats(mapped);
    } catch (err) {
      console.error('[Group Scheduler] Error loading chats:', err);
    } finally {
      setChatsLoading(false);
    }
  }, [token, crmFetch]);

  // Load schedules
  const loadSchedules = useCallback(async () => {
    if (!token) return;
    setSchedulesLoading(true);
    try {
      const res = await crmFetch('/api/admin/crm/qr-broadcast-schedule');
      const arr = Array.isArray(res) ? res : [];
      setSchedules(arr.filter((s: Schedule) => s.frequency === 'custom'));
    } catch (err) {
      console.error('[Group Scheduler] Error loading schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  }, [token, crmFetch]);

  useEffect(() => { loadChats(); }, [loadChats]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const groups = useMemo(() => chats.filter(c => c.isGroup), [chats]);
  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chats) m.set(c.id, c.name);
    return m;
  }, [chats]);

  // Regenerate the day-checkbox block when start date or block length changes
  const dateList = useMemo(() => genDates(startDate, numDays), [startDate, numDays]);

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function isDayChecked(d: string) {
    return !unselectedDates.has(d);
  }

  function toggleDay(d: string) {
    setUnselectedDates(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  function setAllDays(value: boolean) {
    if (value) setUnselectedDates(new Set());
    else setUnselectedDates(new Set(dateList));
  }

  async function handleSubmit() {
    setFormError(null);
    setFormSuccess(null);

    if (selectedGroups.size === 0) {
      setFormError('Select at least one WhatsApp group.');
      return;
    }
    if (!messageText.trim()) {
      setFormError('Enter the message to send.');
      return;
    }
    const selectedDates = dateList.filter(d => isDayChecked(d));
    if (selectedDates.length === 0) {
      setFormError('Select at least one day in the schedule block.');
      return;
    }

    const groupJids = Array.from(selectedGroups);
    const firstGroupName = groupNameById.get(groupJids[0]) || groupJids[0];
    const name = scheduleName.trim() || `${firstGroupName} @ ${sendTime} (${selectedDates.length} days)`;

    setSubmitting(true);
    try {
      const body: Record<string, any> = {
        name,
        messageText: messageText.trim(),
        recipientChatIds: groupJids,
        groupIds: groupJids,
        individualIds: [],
        frequency: 'custom',
        customScheduleDates: selectedDates.map(d => `${d}T00:00:00+05:30`),
        startTime: sendTime,
        endTime: addMinutes(sendTime, 30),
        status: 'scheduled',
        isActive: true,
      };

      let result: any;
      if (editingId) {
        body.sentRecipientChatIds = [];
        result = await crmFetch(`/api/admin/crm/qr-broadcast-schedule/${editingId}`, {
          method: 'PUT',
          body,
        });
      } else {
        result = await crmFetch('/api/admin/crm/qr-broadcast-schedule', {
          method: 'POST',
          body,
        });
      }

      const verb = editingId ? 'Updated' : 'Scheduled';
      if (result?.timeAdjusted && result?.startTime) {
        setFormSuccess(
          `${verb} "${name}" for ${selectedDates.length} day(s). Time shifted to ${result.startTime} IST ` +
          `(15-min gap kept from another group schedule on the same day).`
        );
      } else {
        setFormSuccess(`${verb} "${name}" for ${selectedDates.length} day(s) at ${sendTime} IST.`);
      }
      cancelEdit();
      await loadSchedules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : `Failed to ${editingId ? 'update' : 'create'} schedule`);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(s: Schedule) {
    setEditingId(s._id);
    setSelectedGroups(new Set(s.groupIds?.length ? s.groupIds : (s.recipientChatIds || [])));
    setMessageText(s.messageText || '');
    setSendTime(s.startTime || '18:00');
    setScheduleName(s.name || '');
    const existingKeys = (s.customScheduleDates || []).map(toIstDateKey).sort();
    if (existingKeys.length > 0) {
      const start = existingKeys[0];
      const end = existingKeys[existingKeys.length - 1];
      const span = Math.min(60, Math.max(1, daysBetween(start, end) + 1));
      setStartDate(start);
      setNumDays(span);
      const newDateList = genDates(start, span);
      setUnselectedDates(new Set(newDateList.filter(d => !existingKeys.includes(d))));
    }
    setFormError(null);
    setFormSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedGroups(new Set());
    setMessageText('');
    setScheduleName('');
    setSendTime('18:00');
    setStartDate(tomorrowDateStr());
    setNumDays(15);
    setUnselectedDates(new Set());
  }

  async function runAction(id: string, action: 'pause' | 'resume' | 'delete') {
    setActionLoading(id + action);
    try {
      if (action === 'delete') {
        await crmFetch(`/api/admin/crm/qr-broadcast-schedule/${id}`, { method: 'DELETE' });
        setSchedules(prev => prev.filter(s => s._id !== id));
      } else {
        await crmFetch(`/api/admin/crm/qr-broadcast-schedule/${id}/${action}`, { method: 'POST' });
        await loadSchedules();
      }
    } catch (err) {
      console.error(`[Group Scheduler] ${action} failed:`, err);
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  }

  function remainingDaysCount(s: Schedule): number {
    if (!Array.isArray(s.customScheduleDates)) return 0;
    const todayStr = todayDateStr();
    return s.customScheduleDates.filter(d => {
      const ds = new Date(d).toISOString().slice(0, 10);
      return ds >= todayStr;
    }).length;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Scheduled Group Messages</h1>
        <p className="text-sm text-gray-500 mb-6">
          Send a message to a WhatsApp group automatically at a set time, repeated on the days you choose.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Create form ── */}
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" /> {editingId ? 'Edit Schedule' : 'New Schedule'}
              </h2>
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium flex items-center gap-1 hover:bg-gray-200"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            {/* Group picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Users className="w-4 h-4" /> WhatsApp Group(s)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {chatsLoading ? (
                  <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : filteredGroups.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-400">No groups found</p>
                ) : (
                  filteredGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-purple-50 transition ${selectedGroups.has(g.id) ? 'bg-purple-50' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedGroups.has(g.id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                        {selectedGroups.has(g.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{g.name}</span>
                    </button>
                  ))
                )}
              </div>
              {selectedGroups.size > 0 && (
                <p className="text-xs text-gray-500 mt-1">{selectedGroups.size} group(s) selected</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> Message
              </label>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="e.g. 🙏 Today's Zoom link: https://zoom.us/j/..."
                rows={5}
                maxLength={4096}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none text-sm"
              />
              <span className="text-xs text-gray-400">{messageText.length}/4096</span>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Send Time (IST)
              </label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Message is sent automatically at this time each selected day (±a few minutes). Any time of day (24 hours) is allowed.</p>
              <p className="text-xs text-gray-400 mt-1">If another group schedule already sends within 15 minutes of this time on the same day, this schedule's time is auto-shifted to keep a 15-minute gap.</p>
            </div>

            {/* Day block */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Repeat on these days
              </label>
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <span className="text-xs text-gray-500">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2 py-1.5 border rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">Block size</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={numDays}
                  onChange={e => setNumDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  className="w-20 px-2 py-1.5 border rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">days</span>
              </div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setAllDays(true)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Select all</button>
                <button onClick={() => setAllDays(false)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">Clear all</button>
                <span className="text-xs text-gray-400 ml-auto self-center">{dateList.filter(d => isDayChecked(d)).length} of {numDays} selected</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                {dateList.map(d => (
                  <label key={d} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer ${isDayChecked(d) ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-400'}`}>
                    <input type="checkbox" checked={isDayChecked(d)} onChange={() => toggleDay(d)} className="accent-green-600" />
                    {fmtDayLabel(d)}
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule name (optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Schedule Name (optional)</label>
              <input
                type="text"
                value={scheduleName}
                onChange={e => setScheduleName(e.target.value)}
                placeholder="e.g. 7 Days Swar Yoga - Zoom Link 6PM"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {formSuccess}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {submitting ? 'Saving...' : editingId ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>

          {/* ── Existing schedules ── */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-purple-600" /> Scheduled Messages
              </h2>
              <button onClick={loadSchedules} disabled={schedulesLoading} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <RefreshCw className={`w-4 h-4 ${schedulesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {schedulesLoading && schedules.length === 0 ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : schedules.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">No scheduled group messages yet.</p>
            ) : (
              <div className="space-y-3 max-h-[42rem] overflow-y-auto">
                {schedules.map(s => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft;
                  const groupNames = (s.groupIds?.length ? s.groupIds : s.recipientChatIds || [])
                    .map(id => groupNameById.get(id) || id);
                  const remaining = remainingDaysCount(s);
                  return (
                    <div key={s._id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 truncate">{s.name}</span>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">{groupNames.join(', ')}</p>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{s.messageText}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.startTime} IST</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {remaining} of {s.customScheduleDates?.length || 0} days left</span>
                        {s.lastRunDate && <span>Last sent {fmtDateTime(s.lastRunDate)}</span>}
                      </div>
                      {s.lastError && (
                        <div className="mb-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{s.lastError}</div>
                      )}
                      <div className="flex items-center gap-2">
                        {s.status === 'paused' ? (
                          <button
                            onClick={() => runAction(s._id, 'resume')}
                            disabled={!!actionLoading}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium flex items-center gap-1 hover:bg-green-200"
                          >
                            {actionLoading === s._id + 'resume' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Resume
                          </button>
                        ) : (
                          <button
                            onClick={() => runAction(s._id, 'pause')}
                            disabled={!!actionLoading}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded font-medium flex items-center gap-1 hover:bg-orange-200"
                          >
                            {actionLoading === s._id + 'pause' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />} Pause
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(s)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium flex items-center gap-1 hover:bg-blue-200"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {deleteConfirm === s._id ? (
                          <>
                            <button onClick={() => runAction(s._id, 'delete')} disabled={!!actionLoading} className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium">
                              {actionLoading === s._id + 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm delete'}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded font-medium">No</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(s._id)} className="px-2 py-1 text-xs text-red-500 rounded font-medium flex items-center gap-1 hover:bg-red-50">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
