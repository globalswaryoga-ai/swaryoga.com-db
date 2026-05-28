'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, ChevronRight, ChevronLeft, MessageSquare, Users, Calendar,
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

const GAP_PRESETS: Record<string, { label: string; minSeconds: number; maxSeconds: number; desc: string }> = {
  ULTRA_SAFE:   { label: '🟢 Ultra Safe (30/hr)',    minSeconds: 90,  maxSeconds: 180, desc: 'Minimum ban risk' },
  VERY_SAFE:    { label: '🟢 Very Safe (45/hr)',     minSeconds: 60,  maxSeconds: 120, desc: 'Very safe' },
  SAFE:         { label: '🟢 Safe (60/hr)',           minSeconds: 45,  maxSeconds: 90,  desc: 'RECOMMENDED ✓' },
  PROFESSIONAL: { label: '🟡 Professional (90/hr)',  minSeconds: 30,  maxSeconds: 60,  desc: 'Faster, small risk' },
  AGGRESSIVE:   { label: '🔴 Aggressive (150/hr)',   minSeconds: 15,  maxSeconds: 30,  desc: 'High ban risk' },
};

const STEPS = ['Template', 'Recipients', 'Schedule'];

// ── Header icon ───────────────────────────────────────────────────────────────
function HeaderIcon({ type }: { type?: string }) {
  if (type === 'IMAGE') return <Image className="w-4 h-4 text-blue-500" />;
  if (type === 'VIDEO') return <Video className="w-4 h-4 text-purple-500" />;
  if (type === 'DOCUMENT') return <File className="w-4 h-4 text-orange-500" />;
  return null;
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
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLabel, setFilterLabel] = useState('');

  // Step 3 — schedule
  const [runName, setRunName] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [gapPreset, setGapPreset] = useState('SAFE');

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
      .then((res: any) => setTemplates(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [token]);

  // Load leads when entering step 2
  const loadLeads = useCallback(async () => {
    if (!token) return;
    setLeadsLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (filterStatus) params.set('status', filterStatus);
    if (filterLabel) params.set('label', filterLabel);
    if (leadSearch) params.set('search', leadSearch);
    const res = await crmFetch(`/api/admin/crm/leads?${params}`).catch(() => null);
    const items: Lead[] = Array.isArray(res?.data?.leads) ? res.data.leads : [];
    setLeads(items);
    setLeadsLoading(false);
  }, [token, filterStatus, filterLabel, leadSearch]);

  useEffect(() => {
    if (step === 1) loadLeads();
  }, [step, filterStatus, filterLabel]);

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
    if (mode === 'schedule' && !scheduledAt) { setError('Please set a scheduled time'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const preset = GAP_PRESETS[gapPreset] || GAP_PRESETS.SAFE;
      const body: any = {
        name: runName.trim() || `QR Broadcast – ${selectedTemplate.templateName} – ${new Date().toLocaleDateString('en-IN')}`,
        templateId: selectedTemplate._id,
        provider: 'qr',
        mode,
        target: { type: 'leadIds', leadIds: Array.from(selectedLeadIds) },
        messageInterval: {
          enabled: true,
          minSeconds: preset.minSeconds,
          maxSeconds: preset.maxSeconds,
        },
      };
      if (mode === 'schedule') body.scheduleAt = new Date(scheduledAt).toISOString();

      const res = await crmFetch('/api/admin/crm/broadcast-runs', { method: 'POST', body: JSON.stringify(body) });
      if (!res?.success) throw new Error(res?.error || 'Failed to create broadcast run');

      // If mode=now, trigger immediate processing
      if (mode === 'now') {
        await crmFetch('/api/admin/crm/broadcast-runs/run', {
          method: 'POST',
          body: JSON.stringify({ runId: res.data._id }),
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
                      {selectedTemplate?._id === t._id && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
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
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="new_lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="enrolled">Enrolled</option>
                <option value="hot">Hot</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="lead">Lead</option>
              </select>
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

            {/* When to send */}
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
            </div>

            {/* Gap strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Speed (Anti-ban Protection)
              </label>
              <div className="space-y-2">
                {Object.entries(GAP_PRESETS).map(([key, preset]) => (
                  <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    gapPreset === key ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="gapPreset"
                      value={key}
                      checked={gapPreset === key}
                      onChange={() => setGapPreset(key)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{preset.label}</div>
                      <div className="text-xs text-gray-500">{preset.desc} · {preset.minSeconds}–{preset.maxSeconds}s between messages</div>
                    </div>
                  </label>
                ))}
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
              disabled={submitting}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mode === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
