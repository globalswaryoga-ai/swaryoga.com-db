'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCRM } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner, AddToBroadcastModal } from '@/components/admin/crm';
import { buildLabelOptions } from '@/lib/crm/labels';

type LeadRow = {
  _id: string;
  name?: string;
  phoneNumber?: string;
  status?: string;
  workshopName?: string;
  labels?: string[];
  assignedToUserId?: string;
};

type AdminUserRow = { _id: string; userId?: string; email?: string };

type WhatsAppTemplateRow = {
  _id: string;
  templateName: string;
  category?: string;
  language?: string;
  templateContent: string;
  status?: string;
  buttons?: Array<{ title?: string }>;
  headerMedia?: { kind?: 'image' | 'video'; url?: string };
};

type TemplatePreviewPayload = {
  headerMedia?: { kind?: 'image' | 'video'; url?: string };
  buttons?: Array<{ title?: string }>;
  body?: string;
  footer?: string;
};

function safeParseTemplatePreview(content: string): TemplatePreviewPayload | null {
  try {
    const trimmed = String(content || '').trim();
    if (!trimmed) return null;
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return null;
    // Accept either {body, footer, headerMedia, buttons} or nested {preview: {...}}
    const candidate = (parsed as any).preview && typeof (parsed as any).preview === 'object' ? (parsed as any).preview : parsed;
    return {
      headerMedia: candidate?.headerMedia,
      buttons: Array.isArray(candidate?.buttons) ? candidate.buttons : undefined,
      body: typeof candidate?.body === 'string' ? candidate.body : undefined,
      footer: typeof candidate?.footer === 'string' ? candidate.footer : undefined,
    };
  } catch {
    return null;
  }
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((x) => String(x).trim()).filter(Boolean)));
}

// Broadcast segmentation buckets (user-facing).
// These should be stable options so the filter behaves predictably.
// NOTE: CRM Lead.status uses singular values like "lead".
// We still support legacy/plural inputs for backward compatibility.
const DEFAULT_STATUS_OPTIONS = ['lead', 'prospect', 'customer', 'inactive'];

export default function BroadcastPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });

  const listId = sp.get('listId') || '';
  const deepLinkLeadId = sp.get('leadId') || '';

  // Filter controls
  const [status, setStatus] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [label, setLabel] = useState('');

  // Support deep-links from other pages (e.g., Leads page) so Broadcast can open
  // with filters pre-selected.
  useEffect(() => {
    const qsStatus = sp.get('status') || '';
    const qsWorkshop = sp.get('workshop') || '';
    const qsUserId = sp.get('userId') || '';
    const qsLabel = sp.get('label') || '';

    // Only set if currently empty to avoid overriding user interactions.
    setStatus((prev) => (prev ? prev : qsStatus));
    setWorkshopName((prev) => (prev ? prev : qsWorkshop));
    setAdminUserId((prev) => (prev ? prev : qsUserId));
    setLabel((prev) => (prev ? prev : qsLabel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplateRow[]>([]);
  const [broadcastLists, setBroadcastLists] = useState<any[]>([]);

  // Options for filters (don't depend on current leads result set).
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  
  // Broadcast list modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // Track last fetch to prevent rapid retries on errors
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL_MS = 2000; // Minimum 2 second interval between fetch attempts

  // Template selection + preview
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const selectedTemplatePreview = useMemo(() => {
    if (!selectedTemplate) return null;
    const parsed = safeParseTemplatePreview(selectedTemplate.templateContent);
    return parsed;
  }, [selectedTemplate]);

  // Mode
  const [sendMode, setSendMode] = useState<'now' | 'schedule' | 'delay'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [delayMins, setDelayMins] = useState('5');
  
  // Delay breakdown (days, hours, minutes, seconds)
  const [delayDays, setDelayDays] = useState('0');
  const [delayHours, setDelayHours] = useState('0');
  const [delaySeconds, setDelaySeconds] = useState('0');

  // Broadcast run tracking
  const [activeRunId, setActiveRunId] = useState<string>('');
  const [runStats, setRunStats] = useState<{ total: number; pending: number; sent: number; failed: number; skipped: number }>(
    { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0 }
  );

  const draftCount = useMemo(
    () => (selectedLeadIds.size && selectedTemplate ? selectedLeadIds.size : 0),
    [selectedLeadIds.size, selectedTemplate]
  );

  const statusOptions = useMemo(() => {
    // IMPORTANT: Keep this fixed to the default buckets.
    // We don't want per-lead random statuses to appear here.
    return [...DEFAULT_STATUS_OPTIONS];
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const res: any = await crm.fetch('/api/admin/crm/leads/metadata', { method: 'GET' });
      const data = res?.data || res;
      const workshops = Array.isArray(data?.workshops) ? data.workshops : [];
      const labels = Array.isArray(data?.labels) ? data.labels : [];
      const canonicalLabels = Array.isArray(data?.canonicalLabels) ? data.canonicalLabels : [];

      setWorkshopOptions(uniq(workshops.map((x: any) => String(x))).sort((a, b) => a.localeCompare(b)));
      // Use canonical labels everywhere. Legacy labels are intentionally not offered in dropdown.
      // However, we still pass DB labels as `existing` so if includeLegacy is toggled in the future,
      // we have data handy.
      const canonical = canonicalLabels.length ? canonicalLabels.map((x: any) => String(x)) : undefined;
      setLabelOptions(buildLabelOptions({ existing: labels, includeLegacy: false }).map((x) => String(x)));
    } catch {
      // If metadata endpoint isn't available, gracefully fall back to deriving from current leads.
      const fallbackWorkshops = uniq(leads.map((l) => String(l.workshopName || '')).filter(Boolean)).sort((a, b) =>
        a.localeCompare(b)
      );
      const fallbackLabels = buildLabelOptions({
        existing: leads
          .flatMap((l) => (Array.isArray(l.labels) ? l.labels : []))
          .map((x) => String(x)),
        includeLegacy: false,
      }).sort((a, b) => a.localeCompare(b));
      setWorkshopOptions(fallbackWorkshops);
      setLabelOptions(fallbackLabels);
    }
  }, [crm, leads]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const res: any = await crm.fetch('/api/admin/auth/users', { method: 'GET' });
      const users = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : [];
      setAdminUsers(users);
    } catch {
      // not fatal
      setAdminUsers([]);
    }
  }, [crm]);

  const fetchBroadcastLists = useCallback(async () => {
    try {
      const res: any = await crm.fetch('/api/admin/crm/broadcast-lists', { method: 'GET' });
      const lists = Array.isArray(res?.data?.lists) ? res.data.lists : [];
      setBroadcastLists(lists);
    } catch {
      // not fatal
      setBroadcastLists([]);
    }
  }, [crm]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res: any = await crm.fetch('/api/admin/crm/templates', { method: 'GET' });
      const rows = Array.isArray(res?.data?.templates)
        ? res.data.templates
        : Array.isArray(res?.templates)
          ? res.templates
          : [];
      setTemplates(rows);
    } catch {
      setTemplates([]);
    }
  }, [crm]);

  const fetchLeads = useCallback(async () => {
    // Throttle: prevent rapid retries when there are errors
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) {
      return;
    }
    lastFetchTimeRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Fetch *all* leads for accurate client-side status/label segmentation.
      // NOTE: The leads API is paginated by default, so we must request a high limit
      // otherwise filters will "miss" leads that exist beyond the first page.
    params.set('limit', '5000');
    params.set('skip', '0');
    // Allows super-admin to request a larger dataset from the API.
    params.set('selectAll', 'true');
      // Status is a client-side segmentation bucket (leads/prospect/customer/inactive).
      // The server stores granular statuses, so we fetch broadly and filter locally.
      if (workshopName) params.set('workshop', workshopName);
      if (adminUserId) params.set('userId', adminUserId);
      // NOTE: label filtering isn't supported server-side yet; we filter client-side below.

      const url = `/api/admin/crm/leads${params.toString() ? `?${params.toString()}` : ''}`;
      const res: any = await crm.fetch(url, { method: 'GET' });

      const rows: LeadRow[] = Array.isArray(res?.data?.leads) ? res.data.leads : [];
    const serverTotal: number = Number(res?.data?.total ?? rows.length ?? 0);

      const normalizeStatus = (s: any) => String(s || '').trim().toLowerCase();
      const statusBucket = (s: any): 'lead' | 'prospect' | 'customer' | 'inactive' | '' => {
        const v = normalizeStatus(s);
        if (!v) return '';
        if (v === 'inactive') return 'inactive';

        // Customer bucket
        if (['customer', 'registered', 'paid', 'converted'].includes(v)) return 'customer';

        // Prospect bucket
        if (['prospect', 'interested', 'follow_up', 'followup', 'follow-up'].includes(v)) return 'prospect';

  // Lead bucket
  if (['leads', 'lead', 'new'].includes(v)) return 'lead';

        // Unknown statuses default to Lead (keeps backward compatibility)
        return 'lead';
      };

      // Client-side filters (until we extend the API)
      let filtered = rows;

      if (status) {
        const wanted = statusBucket(status);
        // Compare bucket-to-bucket so that user-facing "lead" matches
        // underlying values like "new" or legacy "leads".
        filtered = filtered.filter((l) => statusBucket(l.status) === wanted);
      }

      if (label) {
        const wanted = String(label).trim().toLowerCase();
        filtered = filtered.filter((l) =>
          (Array.isArray(l.labels) ? l.labels : []).some((x) => String(x).trim().toLowerCase() === wanted)
        );
      }

      setLeads(filtered);
    // Total is used for the filter header/count display.
    // If we aren't applying any client-side narrowing, show the server total.
    // Otherwise show the narrowed count.
      const hasClientSideFilter = Boolean(status) || Boolean(label);
      setTotal(hasClientSideFilter ? filtered.length : serverTotal);

      // Keep selection only for visible leads
      setSelectedLeadIds((prev) => {
        const visible = new Set(filtered.map((l) => l._id));
        const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
        // Deep-link convenience: if a leadId query param is provided, auto-select it
        // (only if it's visible in the current filtered results).
        if (deepLinkLeadId && visible.has(deepLinkLeadId)) {
          next.add(deepLinkLeadId);
        }
        return next;
      });
    } catch (e) {
      setLeads([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [adminUserId, crm, deepLinkLeadId, label, status, workshopName]);

  useEffect(() => {
    if (!token) return;
    void fetchAdminUsers();
    void fetchTemplates();
    void fetchBroadcastLists();
    void fetchMetadata();
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void fetchLeads();
  }, [token, status, workshopName, adminUserId, label, fetchLeads]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedLeadIds((prev) => {
      const visible = leads.map((l) => l._id);
      const allSelected = visible.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visible.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visible.forEach((id) => next.add(id));
      return next;
    });
  };

  const submitBroadcast = async () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (!selectedLeadIds.size) {
      setError('Please select at least 1 lead');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const leadIds = Array.from(selectedLeadIds);

      const payload: any = {
        mode: sendMode,
        templateId: selectedTemplate._id,
        target: { leadIds },
      };

      if (sendMode === 'schedule') {
        if (!scheduleAt) throw new Error('Please pick schedule time');
        payload.scheduledAt = new Date(scheduleAt).toISOString();
      }
      if (sendMode === 'delay') {
        const days = Number(delayDays || 0);
        const hours = Number(delayHours || 0);
        const mins = Number(delayMins || 0);
        const secs = Number(delaySeconds || 0);
        
        const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60) + secs;
        if (!totalSeconds || totalSeconds < 1) throw new Error('Delay must be at least 1 second');
        payload.delaySeconds = totalSeconds;
      }

      const created: any = await crm.fetch('/api/admin/crm/broadcast-runs', {
        method: 'POST',
        // useCRM will JSON.stringify() the body for us.
        body: payload,
      });

      const run = created?.data?.run;
      if (!run?._id) throw new Error('Failed to create broadcast run');

      setActiveRunId(String(run._id));
      setRunStats({
        total: Number(run?.stats?.total || 0),
        pending: Number(run?.stats?.pending || 0),
        sent: Number(run?.stats?.sent || 0),
        failed: Number(run?.stats?.failed || 0),
        skipped: Number(run?.stats?.skipped || 0),
      });

      // Best-effort: for "send now" we try triggering immediate processing.
      // If CRON_SECRET is required server-side, this will fail silently and cron will handle it.
      if (sendMode === 'now') {
        try {
          await crm.fetch('/api/admin/crm/broadcast-runs/run', { method: 'POST' });
        } catch {
          // ignore
        }
      }

      setSelectedLeadIds(new Set());
      setSelectedTemplateId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => {
    if (!runStats.total) return 0;
    const done = runStats.sent + runStats.failed + runStats.skipped;
    return Math.max(0, Math.min(1, done / runStats.total));
  }, [runStats.failed, runStats.sent, runStats.skipped, runStats.total]);

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>📢 WhatsApp Broadcast</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>
            Filter leads → select template → preview → send now / schedule / delay
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/admin/crm" style={{ fontSize: 13, background: '#F3F4F6', padding: '6px 12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', color: '#374151' }}>
            🏠 Dashboard
          </Link>
          <Link href="/admin/crm/automation" style={{ fontSize: 13 }}>
            Automation
          </Link>
          <Link href="/admin/crm/whatsapp" style={{ fontSize: 13 }}>
            Back to WhatsApp
          </Link>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 12 }}>
          <AlertBox type="error" message={error} />
        </div>
      ) : null}

      {/* Broadcast Lists Selection */}
      {broadcastLists.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(17, 24, 39, 0.08)', borderRadius: 14, background: '#F9FAFB' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 Your Broadcast Lists</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {broadcastLists.map((list) => (
              <button
                key={list._id}
                onClick={() => router.push(`/admin/crm/broadcast?listId=${list._id}`)}
                style={{
                  padding: 12,
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{list.name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  {list.description || 'No description'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
        {[
          { label: 'Sent', value: runStats.sent, bg: '#ECFDF5', color: '#065F46' },
          { label: 'Pending', value: runStats.pending, bg: '#FFFBEB', color: '#92400E' },
          { label: 'Draft', value: draftCount, bg: '#EEF2FF', color: '#3730A3' },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              border: '1px solid rgba(17, 24, 39, 0.08)',
              borderRadius: 14,
              padding: 12,
              background: c.bg,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 12, marginTop: 12, minHeight: '70vh' }}>
        {/* Left: filters + leads */}
        <div style={{ 
          border: '1px solid rgba(17, 24, 39, 0.08)', 
          borderRadius: 14, 
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(17, 24, 39, 0.06)', flexShrink: 0 }}>
            <div style={{ fontWeight: 800 }}>Filters</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Status</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="">All</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Workshop</div>
                <select value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} style={{ width: '100%' }}>
                  <option value="">All</option>
                  {workshopOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Admin user</div>
                <select value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">All</option>
                  {adminUsers.map((u) => (
                    <option key={u._id} value={u.userId || ''}>
                      {u.userId || u.email || u._id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Label</div>
                <select value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: '100%' }}>
                  <option value="">All</option>
                  {labelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' as any }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {loading ? 'Loading…' : `${leads.length} leads`} {total ? `(total: ${total})` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={toggleAllVisible} disabled={!leads.length || loading}>
                  {leads.length && leads.every((l) => selectedLeadIds.has(l._id)) ? 'Unselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastModalOpen(true);
                  }}
                  disabled={!leads.length || loading}
                  title="Add all filtered leads to a broadcast list"
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid rgba(17, 24, 39, 0.08)',
                    borderRadius: 6,
                    background: '#DBEAFE',
                    color: '#1e40af',
                    cursor: 'pointer',
                  }}
                >
                  📢 Add All to Broadcast
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Selected count header */}
            {leads.length > 0 && (
              <div style={{ 
                padding: '8px 10px', 
                marginBottom: 10,
                background: '#F0F9FF',
                border: '1px solid #E0F2FE',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#0369A1',
                textAlign: 'center'
              }}>
                ✅ {selectedLeadIds.size} of {leads.length} leads selected
              </div>
            )}

            {/* Leads list container */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
              {loading ? (
                <LoadingSpinner />
              ) : leads.length === 0 ? (
                <div style={{ color: '#6B7280', fontSize: 13 }}>No leads match your filters.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {leads.map((l) => {
                    const checked = selectedLeadIds.has(l._id);
                    return (
                      <label
                        key={l._id}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(17, 24, 39, 0.08)',
                          background: checked ? '#EEF2FF' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleLead(l._id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, color: '#111827' }}>
                            {l.name || 'Unnamed'}{' '}
                            <span style={{ fontWeight: 600, color: '#6B7280' }}>{l.phoneNumber || ''}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {l.status ? `Status: ${l.status}` : ''}
                            {l.status && l.workshopName ? ' • ' : ''}
                            {l.workshopName ? `Workshop: ${l.workshopName}` : ''}
                          </div>
                          {Array.isArray(l.labels) && l.labels.length ? (
                            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' as any }}>
                              {l.labels.slice(0, 6).map((lb) => (
                                <span
                                  key={lb}
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: '#F3F4F6',
                                    color: '#374151',
                                  }}
                                >
                                  {lb}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: template + preview + actions */}
        <div style={{ 
          border: '1px solid rgba(17, 24, 39, 0.08)', 
          borderRadius: 14, 
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(17, 24, 39, 0.06)', flexShrink: 0 }}>
            <div style={{ fontWeight: 800 }}>Message</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Select template, preview, then choose send mode
            </div>
          </div>

          <div style={{ padding: 12, display: 'grid', gap: 10, overflowY: 'auto', flex: 1 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Template</div>
              <select
                id="template-select"
                name="template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.templateName}
                    {t.category ? ` • ${t.category}` : ''}
                    {t.status ? ` • ${t.status}` : ''}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 8 }}>
                <Link href="/admin/crm/whatsapp/templates" style={{ fontSize: 12 }}>
                  Manage templates
                </Link>
              </div>
            </div>

            <div
              style={{
                border: '1px solid rgba(17, 24, 39, 0.08)',
                borderRadius: 14,
                background: '#F9FAFB',
                padding: 10,
                minHeight: 220,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>Preview</div>
              {!selectedTemplate ? (
                <div style={{ marginTop: 8, color: '#6B7280', fontSize: 13 }}>Pick a template to preview here.</div>
              ) : (
                <>
                  {((selectedTemplatePreview?.headerMedia || selectedTemplate.headerMedia)?.kind === 'image') &&
                  (selectedTemplatePreview?.headerMedia || selectedTemplate.headerMedia)?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(selectedTemplatePreview?.headerMedia || selectedTemplate.headerMedia)!.url!}
                      alt="template header"
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginTop: 8 }}
                    />
                  ) : null}

                  <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 13, color: '#111827' }}>
                    {selectedTemplatePreview?.body ?? selectedTemplate.templateContent}
                  </div>

                  {selectedTemplatePreview?.footer ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>{selectedTemplatePreview.footer}</div>
                  ) : null}

                  {Array.isArray(selectedTemplatePreview?.buttons) && selectedTemplatePreview!.buttons!.length ? (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {selectedTemplatePreview!.buttons!.map((b, idx) => (
                        <div
                          key={`${String(b?.title || 'btn')}-${idx}`}
                          style={{
                            border: '1px solid rgba(17, 24, 39, 0.12)',
                            borderRadius: 10,
                            background: '#fff',
                            padding: '10px 12px',
                            textAlign: 'center',
                            fontSize: 13,
                          }}
                        >
                          {String(b?.title || 'Button')}
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(selectedTemplate.buttons) && selectedTemplate.buttons.length ? (
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
                          }}
                        >
                          {String(b?.title || 'Button')}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* Action row */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap' as any,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as any, marginBottom: 12 }}>
                <button 
                  type="button" 
                  onClick={() => setSendMode('now')} 
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: sendMode === 'now' ? '2px solid #10B981' : '1px solid #D1D5DB',
                    borderRadius: 8,
                    background: sendMode === 'now' ? '#ECFDF5' : '#fff',
                    color: sendMode === 'now' ? '#065F46' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (sendMode !== 'now') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF';
                      (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sendMode !== 'now') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
                      (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                    }
                  }}
                >
                  📤 Send now
                </button>
                <button 
                  type="button" 
                  onClick={() => setSendMode('schedule')} 
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: sendMode === 'schedule' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                    borderRadius: 8,
                    background: sendMode === 'schedule' ? '#EFF6FF' : '#fff',
                    color: sendMode === 'schedule' ? '#1E40AF' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (sendMode !== 'schedule') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF';
                      (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sendMode !== 'schedule') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
                      (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                    }
                  }}
                >
                  📅 Schedule
                </button>
                <button 
                  type="button" 
                  onClick={() => setSendMode('delay')} 
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: sendMode === 'delay' ? '2px solid #F59E0B' : '1px solid #D1D5DB',
                    borderRadius: 8,
                    background: sendMode === 'delay' ? '#FFFBEB' : '#fff',
                    color: sendMode === 'delay' ? '#92400E' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (sendMode !== 'delay') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF';
                      (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sendMode !== 'delay') {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
                      (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                    }
                  }}
                >
                  ⏰ Delay
                </button>
              </div>

              <button type="button" onClick={submitBroadcast} disabled={loading}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 8,
                  background: '#10B981',
                  color: '#fff',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {sendMode === 'now' && '🚀 Send Broadcast Now'}
                {sendMode === 'schedule' && '📅 Schedule Broadcast'}
                {sendMode === 'delay' && '⏰ Send with Delay'}
              </button>
            </div>

            {sendMode === 'schedule' ? (
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Schedule at</div>
                <input
                  id="schedule-datetime"
                  name="scheduledAt"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: '#9CA3AF' }}>
                  Scheduling for templates will be enabled in the next iteration.
                </div>
              </div>
            ) : null}
            {sendMode === 'delay' ? (
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: 600 }}>Delay Duration</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div>
                    <label htmlFor="delay-days" style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Days</label>
                    <input
                      id="delay-days"
                      name="delayDays"
                      type="number"
                      min={0}
                      value={delayDays}
                      onChange={(e) => setDelayDays(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="delay-hours" style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Hours</label>
                    <input
                      id="delay-hours"
                      name="delayHours"
                      type="number"
                      min={0}
                      max={23}
                      value={delayHours}
                      onChange={(e) => setDelayHours(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="delay-minutes" style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Minutes</label>
                    <input
                      id="delay-minutes"
                      name="delayMinutes"
                      type="number"
                      min={0}
                      max={59}
                      value={delayMins}
                      onChange={(e) => setDelayMins(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="delay-seconds" style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Seconds</label>
                    <input
                      id="delay-seconds"
                      name="delaySeconds"
                      type="number"
                      min={0}
                      max={59}
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
                  ⏰ Messages will be sent after the specified delay from send time.
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer: sent message details + progress + view */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(17, 24, 39, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Sent details (coming next)
              </div>
              {activeRunId ? (
                <Link href={`/admin/crm/broadcast-runs/${encodeURIComponent(activeRunId)}`} style={{ fontSize: 13 }}>
                  View
                </Link>
              ) : (
                <button type="button" onClick={() => alert('Create a broadcast first.')}>View</button>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ height: 10, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: '#2563EB' }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                {Math.round(progress * 100)}% complete
              </div>
            </div>
          </div>
        </div>
      </div>

      {listId ? (
        <div style={{ marginTop: 12, color: '#6B7280', fontSize: 12 }}>
          Loaded from listId: <code>{listId}</code>
        </div>
      ) : null}

      {/* Add to Broadcast List Modal */}
      <AddToBroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        leads={leads.filter((l) => l.phoneNumber) as any[]}
        token={token || undefined}
        onSuccess={(result) => {
          setError(null);
          // Show success message
          setTimeout(() => {
            alert(`✓ Successfully added ${result.added} leads to broadcast list "${result.listName}"`);
            if (result.skipped > 0) {
              alert(`ℹ️ ${result.skipped} leads were already in the list`);
            }
          }, 100);
        }}
      />
    </div>
  );
}
