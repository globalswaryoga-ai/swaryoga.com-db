'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCRM } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

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

function uniq(values: string[]) {
  return Array.from(new Set(values.map((x) => String(x).trim()).filter(Boolean)));
}

const DEFAULT_STATUS_OPTIONS = [
  'new',
  'interested',
  'follow_up',
  'registered',
  'paid',
  'converted',
  'not_interested',
  'inactive',
];

export default function BroadcastPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });

  const listId = sp.get('listId') || '';

  // Filter controls
  const [status, setStatus] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [label, setLabel] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplateRow[]>([]);

  // Options for filters (don’t depend on current leads result set).
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Template selection + preview
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Mode
  const [sendMode, setSendMode] = useState<'now' | 'schedule' | 'delay'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [delayMins, setDelayMins] = useState('5');

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
    const fromLeads = uniq(leads.map((l) => String(l.status || '')).filter(Boolean));
    const merged = uniq([...DEFAULT_STATUS_OPTIONS, ...fromLeads]);
    return merged.sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const fetchMetadata = useCallback(async () => {
    try {
      const res: any = await crm.fetch('/api/admin/crm/leads/metadata', { method: 'GET' });
      const data = res?.data || res;
      const workshops = Array.isArray(data?.workshops) ? data.workshops : [];
      const labels = Array.isArray(data?.labels) ? data.labels : [];

      setWorkshopOptions(uniq(workshops.map((x: any) => String(x))).sort((a, b) => a.localeCompare(b)));
      setLabelOptions(uniq(labels.map((x: any) => String(x))).sort((a, b) => a.localeCompare(b)));
    } catch {
      // If metadata endpoint isn't available, gracefully fall back to deriving from current leads.
      const fallbackWorkshops = uniq(leads.map((l) => String(l.workshopName || '')).filter(Boolean)).sort((a, b) =>
        a.localeCompare(b)
      );
      const fallbackLabels = uniq(
        leads
          .flatMap((l) => (Array.isArray(l.labels) ? l.labels : []))
          .map((x) => String(x))
      ).sort((a, b) => a.localeCompare(b));
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
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (workshopName) params.set('workshop', workshopName);
      if (adminUserId) params.set('userId', adminUserId);
      // NOTE: label filtering isn't supported server-side yet; we filter client-side below.

      const url = `/api/admin/crm/leads${params.toString() ? `?${params.toString()}` : ''}`;
      const res: any = await crm.fetch(url, { method: 'GET' });

      const rows: LeadRow[] = Array.isArray(res?.data?.leads) ? res.data.leads : [];
      const count: number = Number(res?.data?.total || rows.length || 0);

      // Client-side label filter (until we extend the API)
      const filtered = label
        ? rows.filter((l) => (Array.isArray(l.labels) ? l.labels : []).some((x) => String(x) === label))
        : rows;

      setLeads(filtered);
      setTotal(label ? filtered.length : count);

      // Keep selection only for visible leads
      setSelectedLeadIds((prev) => {
        const visible = new Set(filtered.map((l) => l._id));
        return new Set(Array.from(prev).filter((id) => visible.has(id)));
      });
    } catch (e) {
      setLeads([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [adminUserId, crm, label, status, workshopName]);

  useEffect(() => {
    if (!token) return;
    void fetchAdminUsers();
    void fetchTemplates();
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
        const mins = Number(delayMins || 0);
        if (!mins || mins < 1) throw new Error('Delay minutes must be >= 1');
        payload.delaySeconds = Math.round(mins * 60);
      }

      const created: any = await crm.fetch('/api/admin/crm/broadcast-runs', {
        method: 'POST',
        body: JSON.stringify(payload),
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 12, marginTop: 12 }}>
        {/* Left: filters + leads */}
        <div style={{ border: '1px solid rgba(17, 24, 39, 0.08)', borderRadius: 14, background: '#fff' }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(17, 24, 39, 0.06)' }}>
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

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {loading ? 'Loading…' : `${leads.length} leads`} {total ? `(total: ${total})` : ''}
              </div>
              <button type="button" onClick={toggleAllVisible} disabled={!leads.length || loading}>
                {leads.length && leads.every((l) => selectedLeadIds.has(l._id)) ? 'Unselect all' : 'Select all'}
              </button>
            </div>
          </div>

          <div style={{ padding: 12 }}>
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

        {/* Right: template + preview + actions */}
        <div style={{ border: '1px solid rgba(17, 24, 39, 0.08)', borderRadius: 14, background: '#fff' }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(17, 24, 39, 0.06)' }}>
            <div style={{ fontWeight: 800 }}>Message</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Select template, preview, then choose send mode
            </div>
          </div>

          <div style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Template</div>
              <select
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
                  {selectedTemplate.headerMedia?.kind === 'image' && selectedTemplate.headerMedia.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedTemplate.headerMedia.url}
                      alt="template header"
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginTop: 8 }}
                    />
                  ) : null}
                  <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 13, color: '#111827' }}>
                    {selectedTemplate.templateContent}
                  </div>
                  {Array.isArray(selectedTemplate.buttons) && selectedTemplate.buttons.length ? (
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as any }}>
                <button type="button" onClick={() => setSendMode('now')} disabled={loading}>
                  Send now
                </button>
                <button type="button" onClick={() => setSendMode('schedule')} disabled={loading}>
                  Schedule
                </button>
                <button type="button" onClick={() => setSendMode('delay')} disabled={loading}>
                  Delay
                </button>
              </div>

              <button type="button" onClick={submitBroadcast} disabled={loading}>
                Submit
              </button>
            </div>

            {sendMode === 'schedule' ? (
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Schedule at</div>
                <input
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
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Delay (minutes)</div>
                <input
                  type="number"
                  min={1}
                  value={delayMins}
                  onChange={(e) => setDelayMins(e.target.value)}
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: '#9CA3AF' }}>
                  Delay for templates will be enabled in the next iteration.
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
    </div>
  );
}
