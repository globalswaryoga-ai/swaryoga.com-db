'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, ChevronRight, ChevronLeft, ChevronDown, MessageSquare, Users, Calendar,
  Check, Search, X, Loader2, AlertCircle, FileText, Image, Video, File,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Template {
  _id: string;
  templateName: string;
  category: string;
  templateContent: string;
  headerType?: string;
  headerText?: string;
  headerMedia?: { type: string; url?: string };
  footer?: string;
  buttons?: Array<{ type: string; text: string }>;
  provider: string;
}

interface Lead {
  _id: string;
  name: string;
  phoneNumber: string;
  status?: string;
  labels?: string[];
}


const STEPS = ['Template', 'Recipients', 'Schedule'];

const STATUS_OPTIONS = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'hot', label: 'Hot' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'lead', label: 'Lead' },
];

// ── Header icon ───────────────────────────────────────────────────────────────
function HeaderIcon({ type }: { type?: string }) {
  if (type === 'IMAGE') return <Image className="w-4 h-4 text-blue-500" />;
  if (type === 'VIDEO') return <Video className="w-4 h-4 text-purple-500" />;
  if (type === 'DOCUMENT') return <File className="w-4 h-4 text-orange-500" />;
  return null;
}

// ── Multi-select checkbox dropdown ───────────────────────────────────────────
function MultiSelectDropdown({
  allLabel, options, selected, onChange,
}: {
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  const displayText = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label || selected[0])
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white min-w-40 flex items-center justify-between gap-2"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border rounded-lg shadow-lg py-1">
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer font-medium border-b">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className="rounded border-gray-300"
            />
            {allLabel}
          </label>
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="rounded border-gray-300"
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── "Repeat on these days" helpers (mirrors QR Group Scheduler) ────────────────
function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

// ══════════════════════════════════════════════════════════════════════════════
export default function QRBroadcastWizard() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Step 1 — template
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');

  // Step 2 — recipients
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterWorkshops, setFilterWorkshops] = useState<string[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [labelOptions, setLabelOptions] = useState<string[]>([]);

  // Step 3 — schedule
  const [runName, setRunName] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule' | 'delay'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayDays, setDelayDays] = useState(0);
  const [delayHours, setDelayHours] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState(10);

  // Step 3 — repeat (recurring) schedule
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatStartDate, setRepeatStartDate] = useState(tomorrowDateStr());
  const [repeatNumDays, setRepeatNumDays] = useState(15);
  const [repeatUnselectedDates, setRepeatUnselectedDates] = useState<Set<string>>(new Set());
  const [repeatTime, setRepeatTime] = useState('18:00');
  const [repeatScheduleName, setRepeatScheduleName] = useState('');

  const repeatDateList = useMemo(() => genDates(repeatStartDate, repeatNumDays), [repeatStartDate, repeatNumDays]);
  const isRepeatDayChecked = useCallback((d: string) => !repeatUnselectedDates.has(d), [repeatUnselectedDates]);
  const toggleRepeatDay = useCallback((d: string) => {
    setRepeatUnselectedDates(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }, []);
  const setAllRepeatDays = useCallback((value: boolean) => {
    setRepeatUnselectedDates(value ? new Set() : new Set(repeatDateList));
  }, [repeatDateList]);
  const repeatSelectedDates = useMemo(
    () => repeatDateList.filter(d => isRepeatDayChecked(d)),
    [repeatDateList, isRepeatDayChecked]
  );

  // Pre-select template from URL param (from "Use in Broadcast" button)
  useEffect(() => {
    const tid = searchParams.get('templateId');
    if (tid && templates.length) {
      const t = templates.find(t => t._id === tid);
      if (t) { setSelectedTemplate(t); setStep(1); }
    }
  }, [searchParams, templates]);

  // Load QR templates
  useEffect(() => {
    if (!token) return;
    setTemplatesLoading(true);
    crmFetch('/api/admin/crm/templates?provider=qr&limit=100')
      // API shape: { success, templates, data: { templates, ... } }. The list
      // lives at res.data.templates (or res.templates) — NOT res.data itself.
      .then((res: any) => setTemplates(res?.data?.templates ?? res?.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [token]);

  // Load leads when entering step 2
  const loadLeads = useCallback(async () => {
    if (!token) return;
    setLeadsLoading(true);
    // scope=own: QR broadcast is tenant-isolated — only the viewer's own leads,
    // even for the super admin.
    // selectAll=true + limit=5000: the leads API caps at 200 by default, which
    // hid most of a tenant's leads from the recipient picker. selectAll raises
    // that cap to 5000.
    const params = new URLSearchParams({ limit: '5000', selectAll: 'true', scope: 'own' });
    if (filterStatuses.length) params.set('status', filterStatuses.join(','));
    if (filterLabels.length) params.set('label', filterLabels.join(','));
    if (filterWorkshops.length) params.set('workshop', filterWorkshops.join(','));
    if (leadSearch) params.set('search', leadSearch);
    // Unified lead pool: QR broadcast can target ALL of the tenant's leads (not
    // only source=qr_whatsapp). Still tenant-scoped server-side.
    const res = await crmFetch(`/api/admin/crm/leads?${params}`).catch(() => null);
    // crmFetch unwraps the { success, data } envelope, so leads arrive at res.leads
    // (res.data.leads is only there if it didn't unwrap). Handle both shapes.
    const items: Lead[] = Array.isArray(res?.leads) ? res.leads
      : (Array.isArray(res?.data?.leads) ? res.data.leads : []);
    setLeads(items);
    setLeadsLoading(false);
  }, [token, filterStatuses, filterLabels, filterWorkshops, leadSearch]);

  // Load workshop/label filter options (own-tenant scoped, like loadLeads)
  useEffect(() => {
    if (!token || step !== 1) return;
    crmFetch('/api/admin/crm/leads/metadata?scope=own')
      .then((res: any) => {
        const data = res?.data ?? res;
        setWorkshopOptions(Array.isArray(data?.workshops) ? data.workshops : []);
        setLabelOptions(Array.isArray(data?.labels) ? data.labels : []);
      })
      .catch(() => { setWorkshopOptions([]); setLabelOptions([]); });
  }, [token, step]);

  useEffect(() => {
    if (step === 1) loadLeads();
  }, [step, filterStatuses, filterLabels, filterWorkshops]);

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.templateContent.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const filteredLeads = leads.filter(l =>
    !leadSearch || l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.phoneNumber?.includes(leadSearch)
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  function nextStep() {
    if (step === 0 && !selectedTemplate) { setError('Please select a template'); return; }
    if (step === 1 && selectedLeadIds.size === 0) { setError('Please select at least one recipient'); return; }
    setError(null);
    setStep(s => s + 1);
  }

  function prevStep() { setError(null); setStep(s => s - 1); }

  function toggleLead(id: string) {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedLeadIds(new Set(filteredLeads.map(l => l._id))); }
  function clearAll() { setSelectedLeadIds(new Set()); }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedTemplate) return;

    if (repeatEnabled) {
      if (repeatSelectedDates.length === 0) { setError('Select at least one day to repeat on'); return; }
      setSubmitting(true);
      setError(null);
      setResult(null);
      try {
        const leadIds = Array.from(selectedLeadIds);
        if (leadIds.length === 0) throw new Error('Selected recipients have no valid phone numbers');

        const name = repeatScheduleName.trim()
          || runName.trim()
          || `${selectedTemplate.templateName} @ ${repeatTime} (${repeatSelectedDates.length} days)`;
        const body: any = {
          name,
          templateId: selectedTemplate._id,
          provider: 'qr',
          leadIds,
          occurrenceDates: repeatSelectedDates,
          sendTime: repeatTime,
        };
        await crmFetch('/api/admin/crm/broadcast-recurring', { method: 'POST', body });

        setResult({
          success: true,
          message: `✅ Repeat schedule created! ${leadIds.length} recipient(s) across ${repeatSelectedDates.length} occurrence(s). Occurrences after the 1st only resend to delivered/read recipients.`,
        });
        setSelectedLeadIds(new Set());
        setSelectedTemplate(null);
        setRunName('');
        setRepeatScheduleName('');
        setStep(0);
      } catch (err) {
        setResult({ success: false, message: `❌ ${err instanceof Error ? err.message : 'Failed to create repeat schedule'}` });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'schedule' && !scheduledAt) { setError('Please set a scheduled time'); return; }
    const delayMs = ((delayDays * 24 + delayHours) * 60 + delayMinutes) * 60 * 1000;
    if (mode === 'delay' && delayMs <= 0) { setError('Please set a delay greater than 0'); return; }
    setSubmitting(true);
    setError(null);
    try {
      // 'delay' is sent to the server as a normal scheduled run (now + delay).
      const effectiveMode = mode === 'delay' ? 'schedule' : mode;
      const body: any = {
        name: runName.trim() || `QR Broadcast – ${selectedTemplate.templateName} – ${new Date().toLocaleDateString('en-IN')}`,
        templateId: selectedTemplate._id,
        provider: 'qr',
        mode: effectiveMode,
        target: { type: 'leadIds', leadIds: Array.from(selectedLeadIds) },
        // Fixed anti-ban pacing: ~15 messages/hour (mean 240s gap). The server
        // also hard-caps at 15/hr and 150/day (qrSendRateLimit) and auto-shifts
        // any overflow to the next day.
        messageInterval: { enabled: true, minSeconds: 120, maxSeconds: 360 },
      };
      if (mode === 'schedule') body.scheduleAt = new Date(scheduledAt).toISOString();
      if (mode === 'delay') body.scheduleAt = new Date(Date.now() + delayMs).toISOString();

      // crmFetch stringifies the body itself and unwraps the { success, data }
      // envelope (returning the created run), and throws on any non-2xx — so we
      // pass the raw object and read the run id off the result.
      const run = await crmFetch('/api/admin/crm/broadcast-runs', { method: 'POST', body });
      const runId = run?._id || run?.data?._id;

      // If mode=now, trigger immediate processing
      if (mode === 'now' && runId) {
        await crmFetch('/api/admin/crm/broadcast-runs/run', {
          method: 'POST',
          body: { runId },
        }).catch(() => null);
      }

      router.push('/admin/crm/qr/broadcast-schedule');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create broadcast');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-green-600" />
              New QR Broadcast
            </h1>
            <p className="text-sm text-gray-500 mt-1">Send WhatsApp messages via QR bridge</p>
          </div>
          <button onClick={() => router.push('/admin/crm/qr/broadcast-schedule')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center justify-between gap-2 text-sm ${
            result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="font-medium">{result.message}</span>
            <button onClick={() => setResult(null)} className="text-lg hover:opacity-70">×</button>
          </div>
        )}

        {/* ── Step 0: Template ── */}
        {step === 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" /> Select Template
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No QR templates found.</p>
                <a href="/admin/crm/qr/templates" className="text-blue-500 text-sm mt-1 inline-block hover:underline">
                  Create a template →
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredTemplates.map(t => (
                  <button
                    key={t._id}
                    onClick={() => { setSelectedTemplate(t); setError(null); }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedTemplate?._id === t._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <HeaderIcon type={t.headerType} />
                          <span className="font-semibold text-gray-900 text-sm">{t.templateName}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{t.category}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{t.templateContent}</p>
                        {t.buttons && t.buttons.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {t.buttons.map((b, bi) => (
                              <span key={bi} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                {b.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mt-0.5 ${
                        selectedTemplate?._id === t._id
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {selectedTemplate?._id === t._id ? <><Check className="w-3 h-3" /> Selected</> : '+ Select'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Recipients ── */}
        {step === 1 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" /> Select Recipients
            </h2>

            {/* Filters row */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name / phone..."
                  value={leadSearch}
                  onChange={e => { setLeadSearch(e.target.value); loadLeads(); }}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <MultiSelectDropdown
                allLabel="All Statuses"
                options={STATUS_OPTIONS}
                selected={filterStatuses}
                onChange={setFilterStatuses}
              />
              <MultiSelectDropdown
                allLabel="All Workshops"
                options={workshopOptions.map(w => ({ value: w, label: w }))}
                selected={filterWorkshops}
                onChange={setFilterWorkshops}
              />
              <MultiSelectDropdown
                allLabel="All Groups"
                options={labelOptions.map(l => ({ value: l, label: l }))}
                selected={filterLabels}
                onChange={setFilterLabels}
              />
              <button onClick={loadLeads}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                Refresh
              </button>
            </div>

            {/* Select all / clear */}
            <div className="flex items-center gap-3 mb-3">
              <button onClick={selectAll}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-semibold">
                Select All ({filteredLeads.length})
              </button>
              <button onClick={clearAll}
                className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded font-semibold">
                Clear All
              </button>
              <span className="text-sm text-gray-500 ml-auto">
                {selectedLeadIds.size} selected
              </span>
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No leads found with current filters.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto border rounded-lg divide-y">
                {filteredLeads.map(lead => {
                  const selected = selectedLeadIds.has(lead._id);
                  return (
                    <button
                      key={lead._id}
                      onClick={() => toggleLead(lead._id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition ${selected ? 'bg-green-50' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{lead.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{lead.phoneNumber}</div>
                      </div>
                      {lead.status && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                          {lead.status}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Schedule ── */}
        {step === 2 && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" /> Schedule Broadcast
            </h2>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Template</span>
                <span className="font-medium text-gray-900">{selectedTemplate?.templateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipients</span>
                <span className="font-medium text-gray-900">{selectedLeadIds.size} leads</span>
              </div>
            </div>

            {/* Run name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broadcast Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={runName}
                onChange={e => setRunName(e.target.value)}
                placeholder={`QR Broadcast – ${selectedTemplate?.templateName}`}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Repeat message toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={e => setRepeatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">🔁 Repeat message</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">
                Resend on chosen days — only to delivered/read recipients after the 1st send.
              </p>
            </div>

            {/* When to send */}
            {!repeatEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">When to Send</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('now')}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                      mode === 'now' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    ⚡ Send Now
                  </button>
                  <button
                    onClick={() => setMode('schedule')}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                      mode === 'schedule' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    🕐 Schedule Later
                  </button>
                  <button
                    onClick={() => setMode('delay')}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                      mode === 'delay' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    ⏳ Send After Delay
                  </button>
                </div>
                {mode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-3 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
                {mode === 'delay' && (
                  <div className="mt-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Days', value: delayDays, set: setDelayDays, max: 60 },
                        { label: 'Hours', value: delayHours, set: setDelayHours, max: 23 },
                        { label: 'Minutes', value: delayMinutes, set: setDelayMinutes, max: 59 },
                      ].map(f => (
                        <div key={f.label}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                          <input
                            type="number"
                            min={0}
                            max={f.max}
                            value={f.value}
                            onChange={e => f.set(Math.max(0, Math.min(f.max, Number(e.target.value) || 0)))}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Will send around{' '}
                      <span className="font-semibold text-amber-700">
                        {new Date(Date.now() + ((delayDays * 24 + delayHours) * 60 + delayMinutes) * 60000).toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Repeat on these days */}
            {repeatEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Send Time (IST)</label>
                  <input
                    type="time"
                    value={repeatTime}
                    onChange={e => setRepeatTime(e.target.value)}
                    className="px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The message will be sent automatically around this time on each selected day, at the
                    same safe ~15 msgs/hour pace shown below.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">📅 Repeat on these days</label>
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <span className="text-xs text-gray-500">Start date</span>
                    <input
                      type="date"
                      value={repeatStartDate}
                      onChange={e => setRepeatStartDate(e.target.value)}
                      className="px-2 py-1.5 border-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">Block size</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={repeatNumDays}
                      onChange={e => setRepeatNumDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                      className="w-20 px-2 py-1.5 border-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">days</span>
                  </div>
                  <div className="flex gap-2 mb-2 items-center">
                    <button
                      onClick={() => setAllRepeatDays(true)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setAllRepeatDays(false)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium hover:bg-gray-200"
                    >
                      Clear all
                    </button>
                    <span className="text-xs text-gray-400 ml-auto">
                      {repeatSelectedDates.length} of {repeatDateList.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto border-2 rounded-lg p-2">
                    {repeatDateList.map(d => (
                      <label
                        key={d}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer ${
                          isRepeatDayChecked(d) ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isRepeatDayChecked(d)}
                          onChange={() => toggleRepeatDay(d)}
                          className="accent-blue-600"
                        />
                        {fmtDayLabel(d)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={repeatScheduleName}
                    onChange={e => setRepeatScheduleName(e.target.value)}
                    placeholder={`${selectedTemplate?.templateName} @ ${repeatTime} (${repeatSelectedDates.length} days)`}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Send speed — fixed anti-ban policy (no other options) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Speed (Anti-ban Protection)
              </label>
              <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-green-500 bg-green-50">
                <span className="text-lg leading-none mt-0.5">🛡️</span>
                <div>
                  <div className="text-sm font-semibold text-gray-800">15 messages / hour · max 150 / day</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Safe drip pacing (~1 message every 2–6 min). The system auto-stops at the hourly/daily
                    cap and continues the rest the next day — protecting your number from bans.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          {step > 0 ? (
            <button onClick={prevStep}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button onClick={nextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || (repeatEnabled && repeatSelectedDates.length === 0)}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {repeatEnabled ? 'Create Repeat Schedule' : (mode === 'now' ? 'Send Broadcast' : 'Schedule Broadcast')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
