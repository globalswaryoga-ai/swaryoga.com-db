'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================
interface Lead {
  _id: string;
  name?: string;
  phoneNumber: string;
  status?: string;
  labels?: string[];
  workshopName?: string;
  assignedToUserId?: string;
  userName?: string;
  isCSV?: boolean;
  email?: string;
}
interface CSVContact { name?: string; phoneNumber: string; email?: string; raw: Record<string, string> }
interface Template {
  _id: string; templateName: string; templateContent: string;
  headerFormat?: string; headerType?: string;
  headerMedia?: { kind?: string; url?: string; type?: string };
  buttons?: { kind?: string; type?: string; title?: string; text?: string; url?: string }[];
  footer?: string;
}
interface BroadcastRun {
  _id: string; name: string; status: string; provider: string;
  stats: { total: number; pending: number; sent: number; failed: number; skipped: number };
  templateSnapshot?: { templateName?: string };
  createdAt: string; completedAt?: string;
}
type SendMode = 'now' | 'schedule' | 'delay' | 'repeat';
type Step = 1 | 2 | 3;

const GAP_PRESETS: Record<string, { label: string; minS: number; maxS: number; desc: string; safe: string }> = {
  ULTRA_SAFE:   { label: '🟢 Ultra Safe',    minS: 90,  maxS: 180, desc: '30 msgs/hr', safe: 'Minimum ban risk' },
  VERY_SAFE:    { label: '🟢 Very Safe',     minS: 60,  maxS: 120, desc: '45 msgs/hr', safe: 'Very safe' },
  SAFE:         { label: '🟢 Safe',           minS: 45,  maxS: 90,  desc: '60 msgs/hr', safe: 'RECOMMENDED ✓' },
  PROFESSIONAL: { label: '🟡 Professional',  minS: 30,  maxS: 60,  desc: '90 msgs/hr', safe: 'Small risk' },
  AGGRESSIVE:   { label: '🔴 Aggressive',    minS: 15,  maxS: 30,  desc: '150 msgs/hr', safe: 'High ban risk' },
};

// ── "Repeat on these days" helpers (mirrors QR Group Scheduler) ──
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

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; icon: string }> = {
    draft:     { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: '📝' },
    scheduled: { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: '📅' },
    running:   { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🔄' },
    completed: { bg: 'bg-green-100',  text: 'text-green-700',  icon: '✅' },
    failed:    { bg: 'bg-red-100',    text: 'text-red-700',    icon: '❌' },
    pending:   { bg: 'bg-gray-100',   text: 'text-gray-600',   icon: '⏳' },
    sent:      { bg: 'bg-green-100',  text: 'text-green-700',  icon: '✓' },
    skipped:   { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⏭️' },
  };
  const c = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: '•' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span>{c.icon}</span><span className="capitalize">{status}</span>
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function QRBroadcastPage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentRuns, setRecentRuns] = useState<BroadcastRun[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [gapPreset, setGapPreset] = useState('SAFE');
  // ── Repeat (recurring) send — mirrors QR Group Scheduler "Repeat on these days" ──
  const [repeatStartDate, setRepeatStartDate] = useState(tomorrowDateStr());
  const [repeatNumDays, setRepeatNumDays] = useState(15);
  const [repeatUnselectedDates, setRepeatUnselectedDates] = useState<Set<string>>(new Set());
  const [repeatTime, setRepeatTime] = useState('18:00');
  const [repeatScheduleName, setRepeatScheduleName] = useState('');
  const [broadcastName, setBroadcastName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  const [filterAssignedUser, setFilterAssignedUser] = useState('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [csvContacts, setCSVContacts] = useState<CSVContact[]>([]);
  const [csvFileName, setCSVFileName] = useState('');
  const [csvParsing, setCSVParsing] = useState(false);
  const [csvError, setCSVError] = useState<string | null>(null);
  const [csvColumnMap, setCSVColumnMap] = useState<{ name?: string; phone?: string; email?: string } | null>(null);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; runId?: string } | null>(null);
  const [showRecentRuns, setShowRecentRuns] = useState(false);

  useEffect(() => {
    const now = new Date();
    setScheduleDate(now.toISOString().split('T')[0]);
    setScheduleTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  }, []);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [leadsRes, templatesRes, runsRes] = await Promise.all([
        fetch('/api/admin/crm/leads?qrOnly=1&limit=5000&selectAll=true&fields=name,phoneNumber,status,workshopName,assignedToUserId,userName,labels', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/templates?provider=qr&limit=100', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/broadcast-runs?provider=qr&limit=10', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [leadsData, templatesData, runsData] = await Promise.all([leadsRes.json(), templatesRes.json(), runsRes.json()]);
      setLeads(leadsData.data?.leads || leadsData.leads || []);
      setTemplates(Array.isArray(templatesData.data) ? templatesData.data : (templatesData.data?.templates || templatesData.templates || []));
      setRecentRuns(Array.isArray(runsData.data) ? runsData.data : (runsData.data?.runs || runsData.runs || []));
    } catch (err) {
      console.error('[QR Broadcast] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pre-select leads from URL params. Leads not present in the qrOnly-filtered
  // `leads` list (e.g. brand-new enquiry leads that haven't chatted via QR yet)
  // are fetched directly by id and merged in, so they can still be selected.
  const preselectDoneRef = useRef(false);
  useEffect(() => {
    const preselect = searchParams.get('leadIds');
    if (!preselect || loading || preselectDoneRef.current) return;
    preselectDoneRef.current = true;

    const ids = preselect.split(',').filter(Boolean);
    const present = ids.filter(id => leads.some(l => l._id === id));
    const missing = ids.filter(id => !leads.some(l => l._id === id));

    const applySelection = (extra: Lead[] = []) => {
      if (extra.length > 0) {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l._id));
          return [...prev, ...extra.filter(l => !existingIds.has(l._id))];
        });
      }
      const allIds = [...present, ...extra.map(l => l._id)];
      if (allIds.length > 0) { setSelectedLeads(new Set(allIds)); setStep(2); }
    };

    if (missing.length === 0) {
      applySelection();
      return;
    }

    fetch(`/api/admin/crm/leads?ids=${missing.join(',')}&fields=name,phoneNumber,status,workshopName,labels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => applySelection(data?.data?.leads || []))
      .catch(() => applySelection());
  }, [searchParams, leads, loading, token]);

  // Pre-select template from URL
  useEffect(() => {
    const tid = searchParams.get('templateId');
    if (tid && templates.length > 0) {
      const t = templates.find(t => t._id === tid);
      if (t) { setSelectedTemplate(t); if (selectedLeads.size > 0) setStep(3); else setStep(1); }
    }
  }, [searchParams, templates]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredLeads = useMemo(() => {
    let all = [...leads];
    if (csvContacts.length > 0) {
      const existingPhones = new Set(leads.map(l => l.phoneNumber.replace(/\D/g,'').slice(-10)));
      csvContacts.forEach((c, idx) => {
        const norm = c.phoneNumber.replace(/\D/g,'').slice(-10);
        if (!existingPhones.has(norm)) {
          all.push({ _id: `csv_${idx}_${norm}`, name: c.name || '', phoneNumber: c.phoneNumber, email: c.email, status: 'csv', isCSV: true });
        }
      });
    }
    const seen = new Set<string>();
    const deduped = all.filter(l => {
      const n = l.phoneNumber.replace(/\D/g,'').slice(-10);
      if (seen.has(n)) return false;
      seen.add(n); return true;
    });
    return deduped.filter(l => {
      const matchSearch = !searchQuery || l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phoneNumber.includes(searchQuery);
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      const matchWorkshop = filterWorkshop === 'all' || l.workshopName === filterWorkshop;
      const matchUser = filterAssignedUser === 'all' || l.assignedToUserId === filterAssignedUser;
      return matchSearch && matchStatus && matchWorkshop && matchUser;
    });
  }, [leads, csvContacts, searchQuery, filterStatus, filterWorkshop, filterAssignedUser]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates;
    return templates.filter(t => t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) || t.templateContent.toLowerCase().includes(templateSearch.toLowerCase()));
  }, [templates, templateSearch]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.status || 'lead'))).sort(), [leads]);
  const uniqueWorkshops = useMemo(() => Array.from(new Set(leads.map(l => l.workshopName).filter(Boolean))).sort() as string[], [leads]);
  const uniqueAssignedUsers = useMemo(() => {
    const m = new Map<string,string>();
    leads.forEach(l => { if (l.assignedToUserId) m.set(l.assignedToUserId, l.userName || l.assignedToUserId); });
    return Array.from(m.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  }, [leads]);

  const canProceedToStep2 = selectedLeads.size > 0;
  const canProceedToStep3 = selectedTemplate !== null;

  // ── Repeat day-block (mirrors QR Group Scheduler) ──
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
  const repeatSelectedDates = useMemo(() => repeatDateList.filter(d => isRepeatDayChecked(d)), [repeatDateList, isRepeatDayChecked]);

  const canSend = useMemo(() => {
    if (!selectedTemplate || selectedLeads.size === 0) return false;
    if (sendMode === 'schedule' && (!scheduleDate || !scheduleTime)) return false;
    if (sendMode === 'repeat' && repeatSelectedDates.length === 0) return false;
    return true;
  }, [selectedTemplate, selectedLeads, sendMode, scheduleDate, scheduleTime, repeatSelectedDates]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================
  const toggleLead = useCallback((id: string) => {
    setSelectedLeads(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedLeads(prev => prev.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map(l => l._id)));
  }, [filteredLeads]);

  // ============================================================================
  // CSV
  // ============================================================================
  const autoDetectColumns = useCallback((headers: string[]) => {
    const map: { name?: string; phone?: string; email?: string } = {};
    const lower = headers.map(h => h.toLowerCase().replace(/[\s_\-]/g,''));
    const phoneKeys = ['phone','phonenumber','mobile','mobilenumber','contact','number','whatsapp','wanumber','wa','cell','tel','telephone'];
    for (const p of phoneKeys) { const i = lower.findIndex(h => h === p); if (i !== -1) { map.phone = headers[i]; break; } }
    if (!map.phone) { const i = lower.findIndex(h => h.includes('phone')||h.includes('mobile')||h.includes('number')||h.includes('whatsapp')); if (i !== -1) map.phone = headers[i]; }
    const nameKeys = ['name','fullname','firstname','customername','leadname','contactname'];
    for (const p of nameKeys) { const i = lower.findIndex(h => h === p); if (i !== -1) { map.name = headers[i]; break; } }
    if (!map.name) { const i = lower.findIndex(h => h.includes('name')&&!h.includes('file')); if (i !== -1) map.name = headers[i]; }
    const emailKeys = ['email','emailaddress','mail'];
    for (const p of emailKeys) { const i = lower.findIndex(h => h === p); if (i !== -1) { map.email = headers[i]; break; } }
    if (!map.email) { const i = lower.findIndex(h => h.includes('email')||h.includes('mail')); if (i !== -1) map.email = headers[i]; }
    return map;
  }, []);

  const parseCSVText = useCallback((text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [] as string[], rows: [] as Record<string,string>[] };
    const first = lines[0];
    let delim = ',';
    if (first.includes('\t')) delim = '\t';
    else if (first.split(';').length > first.split(',').length) delim = ';';
    const parseRow = (line: string): string[] => {
      const res: string[] = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (ch === delim && !inQ) { res.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      res.push(cur.trim()); return res;
    };
    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseRow(line);
      const row: Record<string,string> = {};
      headers.forEach((h,i) => { row[h] = vals[i] || ''; });
      return row;
    }).filter(r => Object.values(r).some(v => v.trim()));
    return { headers, rows };
  }, []);

  const normalizePhone = useCallback((raw: string): string => {
    if (!raw) return '';
    let d = raw.replace(/[^0-9+]/g,'').replace(/^\+/,'');
    if (d.length === 10) d = '91' + d;
    return d;
  }, []);

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCSVParsing(true); setCSVError(null); setCSVFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCSVText(text);
        if (!headers.length || !rows.length) { setCSVError('No data found'); setCSVParsing(false); return; }
        const colMap = autoDetectColumns(headers);
        if (!colMap.phone) {
          for (const h of headers) {
            const sample = rows.slice(0,10).map(r => r[h]).filter(Boolean);
            if (sample.some(v => /^\+?\d[\d\s\-()]{6,}$/.test(v.trim()))) { colMap.phone = h; break; }
          }
        }
        setCSVColumnMap(colMap);
        if (!colMap.phone) { setCSVError(`Could not detect phone column. Found: ${headers.join(', ')}`); setCSVParsing(false); return; }
        const contacts: CSVContact[] = [];
        const seen = new Set<string>();
        for (const row of rows) {
          const phone = normalizePhone(row[colMap.phone!] || '');
          if (!phone || phone.length < 10 || seen.has(phone)) continue;
          seen.add(phone);
          contacts.push({ name: colMap.name ? row[colMap.name]?.trim() : undefined, phoneNumber: phone, email: colMap.email ? row[colMap.email]?.trim() : undefined, raw: row });
        }
        if (!contacts.length) { setCSVError('No valid phone numbers found'); setCSVParsing(false); return; }
        setCSVContacts(contacts); setShowCSVPreview(true);
        setSelectedLeads(prev => {
          const n = new Set(prev);
          contacts.forEach((c, idx) => {
            const last10 = c.phoneNumber.replace(/\D/g,'').slice(-10);
            const db = leads.find(l => l.phoneNumber.replace(/\D/g,'').slice(-10) === last10);
            if (db) n.add(db._id); else n.add(`csv_${idx}_${last10}`);
          });
          return n;
        });
      } catch (err) { setCSVError(err instanceof Error ? err.message : 'Failed to parse CSV'); }
      finally { setCSVParsing(false); }
    };
    reader.onerror = () => { setCSVError('Failed to read file'); setCSVParsing(false); };
    reader.readAsText(file);
    if (csvFileRef.current) csvFileRef.current.value = '';
  }, [parseCSVText, autoDetectColumns, normalizePhone, leads]);

  const removeCSV = useCallback(() => {
    setSelectedLeads(prev => { const n = new Set(prev); for (const id of prev) if (String(id).startsWith('csv_')) n.delete(id); return n; });
    setCSVContacts([]); setCSVFileName(''); setCSVColumnMap(null); setCSVError(null); setShowCSVPreview(false);
  }, []);

  // ============================================================================
  // SEND BROADCAST
  // ============================================================================
  const handleSend = async () => {
    if (!canSend || !selectedTemplate) return;
    setSending(true); setResult(null);
    try {
      // ── Repeat (recurring) mode → create a BroadcastRecurringSchedule with delivered/read cascading filter ──
      if (sendMode === 'repeat') {
        const realLeadIds = Array.from(selectedLeads).filter(id => !id.startsWith('csv_'));
        if (realLeadIds.length === 0) throw new Error('Repeat requires recipients with saved lead records (CSV-only contacts are not supported)');
        if (repeatSelectedDates.length === 0) throw new Error('Select at least one day to repeat on');

        const name = repeatScheduleName.trim()
          || `${selectedTemplate.templateName} @ ${repeatTime} (${repeatSelectedDates.length} days)`;

        const body = {
          name,
          templateId: selectedTemplate._id,
          provider: 'qr',
          leadIds: realLeadIds,
          occurrenceDates: repeatSelectedDates,
          sendTime: repeatTime,
        };

        const res = await fetch('/api/admin/crm/broadcast-recurring', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create repeat schedule');

        setResult({
          success: true,
          message: `✅ Repeat schedule created! ${realLeadIds.length} recipient(s) across ${repeatSelectedDates.length} occurrence(s). Occurrences after the 1st only resend to delivered/read recipients.`,
        });
        setSelectedLeads(new Set()); setSelectedTemplate(null); setRepeatScheduleName(''); setStep(1);
        return;
      }

      let scheduleAt: string | undefined;
      let delayMins: number | undefined;
      if (sendMode === 'schedule') {
        if (!scheduleDate || !scheduleTime) throw new Error('Select date and time');
        const [y,mo,d] = scheduleDate.split('-').map(Number);
        const [h,mi] = scheduleTime.split(':').map(Number);
        scheduleAt = new Date(y, mo-1, d, h, mi, 0).toISOString();
      } else if (sendMode === 'delay') {
        delayMins = delayMinutes;
      }

      const allIds = Array.from(selectedLeads);
      const realLeadIds = allIds.filter(id => !id.startsWith('csv_'));
      const csvIds = allIds.filter(id => id.startsWith('csv_'));
      const csvContactsData = csvIds.map(id => {
        const idx = parseInt(id.split('_')[1], 10);
        const c = csvContacts[idx];
        return c ? { name: c.name, phoneNumber: c.phoneNumber, email: c.email } : null;
      }).filter(Boolean);

      const target: Record<string, unknown> = { type: 'leadIds', leadIds: realLeadIds };
      if (csvContactsData.length > 0) { target.csvContacts = csvContactsData; }

      const preset = GAP_PRESETS[gapPreset] || GAP_PRESETS.SAFE;
      const payload = {
        name: broadcastName.trim() || `QR Broadcast — ${new Date().toLocaleString('en-IN')}`,
        templateId: selectedTemplate._id,
        mode: sendMode,
        provider: 'qr',
        scheduleAt,
        delayMins,
        target,
        messageInterval: { enabled: true, minSeconds: preset.minS, maxSeconds: preset.maxS },
      };

      const createRes = await fetch('/api/admin/crm/broadcast-runs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) throw new Error(createData.error || 'Failed to create broadcast run');

      const runId = createData.data?._id;

      if (sendMode === 'now' && runId) {
        const runRes = await fetch('/api/admin/crm/broadcast-runs/run', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId }),
        });
        const runData = await runRes.json();
        if (runData.success) {
          setResult({ success: true, message: `✅ Broadcast started! Check History for progress.`, runId });
        } else {
          setResult({ success: true, message: `✅ Broadcast created and queued.`, runId });
        }
      } else {
        setResult({ success: true, message: `✅ Broadcast ${sendMode === 'schedule' ? 'scheduled' : 'created'}! ${selectedLeads.size} recipients.`, runId });
      }

      setSelectedLeads(new Set()); setSelectedTemplate(null); setBroadcastName(''); setStep(1);
      fetchData();
    } catch (err: any) {
      setResult({ success: false, message: `❌ ${err.message || 'Failed to send broadcast'}` });
    } finally {
      setSending(false);
    }
  };

  // ============================================================================
  // STEP INDICATOR
  // ============================================================================
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[{ num: 1, label: 'Recipients', icon: '👥' }, { num: 2, label: 'Template', icon: '📋' }, { num: 3, label: 'Send', icon: '🚀' }].map((s, i) => (
        <div key={s.num} className="flex items-center">
          <button
            onClick={() => {
              if (s.num === 1 || (s.num === 2 && canProceedToStep2) || (s.num === 3 && canProceedToStep2 && canProceedToStep3))
                setStep(s.num as Step);
            }}
            disabled={(s.num === 2 && !canProceedToStep2) || (s.num === 3 && (!canProceedToStep2 || !canProceedToStep3))}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${
              step === s.num ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-105'
              : step > s.num ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
            } ${(s.num === 2 && !canProceedToStep2)||(s.num===3&&(!canProceedToStep2||!canProceedToStep3)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-lg">{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
            {step > s.num && <span className="text-green-600 font-bold">✓</span>}
          </button>
          {i < 2 && <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  if (token === null) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center"><div className="animate-spin text-4xl">⏳</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm/qr" className="text-gray-500 hover:text-gray-700 transition-all hover:-translate-x-1 flex items-center gap-1">
                <span>←</span> <span className="hidden sm:inline">QR WhatsApp</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                📢 QR Broadcast Center
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/admin/crm/qr-templates" className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-sm font-medium flex items-center gap-1">
                📋 <span className="hidden sm:inline">Templates</span>
              </Link>
              <Link href="/admin/crm/qr/broadcast-report" className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium flex items-center gap-1">
                📊 <span className="hidden sm:inline">Reports</span>
              </Link>
              <button
                onClick={() => setShowRecentRuns(!showRecentRuns)}
                className={`px-3 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1 ${showRecentRuns ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
              >
                🕐 <span className="hidden sm:inline">History</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Result Alert */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-center justify-between ${result.success ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            <span className="font-medium">{result.message}</span>
            <button onClick={() => setResult(null)} className="text-lg hover:opacity-70 ml-4">×</button>
          </div>
        )}

        {/* Recent Runs Panel */}
        {showRecentRuns && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg border p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              📊 Recent QR Broadcasts
              <button onClick={fetchData} className="text-green-600 hover:text-green-700 text-sm font-normal">↻ Refresh</button>
            </h3>
            {recentRuns.length === 0 ? (
              <p className="text-gray-500 text-sm">No broadcasts yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentRuns.map(run => (
                  <div key={run._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💚</span>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{run.name}</div>
                        <div className="text-xs text-gray-500">{run.templateSnapshot?.templateName || 'Template'} • {new Date(run.createdAt).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <div className="text-green-600">✓ {run.stats.sent}</div>
                        <div className="text-red-600">✗ {run.stats.failed}</div>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* STEP 1: Recipients */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                👥 Select Recipients
                <span className="text-sm font-normal text-gray-500">({filteredLeads.length} available)</span>
              </h2>
              <input type="text" placeholder="🔍 Search name or phone..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full sm:w-56 text-sm" />
            </div>

            {/* CSV Upload */}
            <div className="mb-4">
              <input ref={csvFileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCSVUpload} className="hidden" />
              {csvContacts.length === 0 ? (
                <button onClick={() => csvFileRef.current?.click()} disabled={csvParsing}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 rounded-xl p-4 flex items-center justify-center gap-3 text-gray-500 hover:text-green-600 transition-all hover:bg-green-50/30 group">
                  {csvParsing ? <span className="animate-spin text-xl">⏳</span> : <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>}
                  <span className="font-medium">{csvParsing ? 'Parsing CSV...' : 'Upload CSV — Auto-detect Name, Phone, Email'}</span>
                </button>
              ) : (
                <div className="border-2 border-green-200 bg-green-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <span className="font-semibold text-green-800">{csvFileName}</span>
                      <span className="text-sm text-green-600">— {csvContacts.length} contacts loaded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowCSVPreview(!showCSVPreview)}
                        className="px-3 py-1 text-sm bg-white border border-green-300 rounded-lg hover:bg-green-50 text-green-700 font-medium">
                        {showCSVPreview ? 'Hide Preview' : 'Preview'}
                      </button>
                      <button onClick={removeCSV} className="px-3 py-1 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-600 font-medium">✕ Remove</button>
                    </div>
                  </div>
                  {csvColumnMap && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {csvColumnMap.phone && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">📱 Phone → {csvColumnMap.phone}</span>}
                      {csvColumnMap.name && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">👤 Name → {csvColumnMap.name}</span>}
                      {csvColumnMap.email && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">✉️ Email → {csvColumnMap.email}</span>}
                    </div>
                  )}
                  {showCSVPreview && (
                    <div className="mt-3 max-h-[200px] overflow-auto rounded-lg border border-green-200">
                      <table className="w-full text-sm">
                        <thead className="bg-green-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-green-800 font-semibold">#</th>
                            <th className="px-3 py-2 text-left text-green-800 font-semibold">Name</th>
                            <th className="px-3 py-2 text-left text-green-800 font-semibold">Phone</th>
                            <th className="px-3 py-2 text-left text-green-800 font-semibold">In DB?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvContacts.slice(0,50).map((c,i) => {
                            const last10 = c.phoneNumber.replace(/\D/g,'').slice(-10);
                            const exists = leads.some(l => l.phoneNumber.replace(/\D/g,'').slice(-10) === last10);
                            return (
                              <tr key={i} className={`border-t border-green-100 ${exists ? 'bg-green-50/40' : ''}`}>
                                <td className="px-3 py-1.5 text-gray-500">{i+1}</td>
                                <td className="px-3 py-1.5 text-gray-800">{c.name || '—'}</td>
                                <td className="px-3 py-1.5 text-gray-700 font-mono text-xs">{c.phoneNumber}</td>
                                <td className="px-3 py-1.5">{exists ? <span className="text-green-600 text-xs font-medium">✓ Exists</span> : <span className="text-orange-500 text-xs font-medium">New</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {csvContacts.length > 50 && <div className="text-center py-2 text-xs text-gray-500 bg-green-50">... and {csvContacts.length - 50} more</div>}
                    </div>
                  )}
                </div>
              )}
              {csvError && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><span>⚠️</span><span>{csvError}</span><button onClick={() => setCSVError(null)} className="ml-auto">×</button></div>}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600 mr-1">🎯 Filter:</span>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white min-w-[120px]">
                <option value="all">All Status</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {uniqueWorkshops.length > 0 && (
                <select value={filterWorkshop} onChange={e => setFilterWorkshop(e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white min-w-[140px]">
                  <option value="all">All Workshops</option>
                  {uniqueWorkshops.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              )}
              {uniqueAssignedUsers.length > 0 && (
                <select value={filterAssignedUser} onChange={e => setFilterAssignedUser(e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white min-w-[140px]">
                  <option value="all">All Users</option>
                  {uniqueAssignedUsers.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}
              {(filterStatus !== 'all' || filterWorkshop !== 'all' || filterAssignedUser !== 'all') && (
                <button onClick={() => { setFilterStatus('all'); setFilterWorkshop('all'); setFilterAssignedUser('all'); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium">✕ Clear</button>
              )}
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox"
                  checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={selectAllFiltered}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
                <span className="font-medium text-green-800 group-hover:text-green-600 transition-colors">Select All ({filteredLeads.length})</span>
              </label>
              <div className="flex items-center gap-4">
                {selectedLeads.size > 0 && <button onClick={() => setSelectedLeads(new Set())} className="text-sm text-red-600 hover:text-red-700 font-medium">Clear</button>}
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-600">{selectedLeads.size}</span>
                  <span className="text-green-700 text-sm">selected</span>
                </div>
              </div>
            </div>

            {/* Leads List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-12 text-gray-500"><div className="animate-spin text-4xl mb-2">⏳</div>Loading leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><span className="text-4xl">👤</span><p className="mt-2">No QR contacts found</p><p className="text-xs mt-1">Only contacts who have chatted via QR WhatsApp appear here</p></div>
              ) : (
                filteredLeads.map(lead => (
                  <label key={lead._id} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group ${
                    selectedLeads.has(lead._id) ? 'bg-green-50 border-2 border-green-400 shadow-sm' : 'bg-gray-50/50 border-2 border-transparent hover:bg-white hover:shadow-sm hover:border-gray-200'
                  }`}>
                    <input type="checkbox" checked={selectedLeads.has(lead._id)} onChange={() => toggleLead(lead._id)} className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate group-hover:text-green-700 transition-colors">{lead.name || 'Unknown'}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{lead.phoneNumber}</span>
                        {lead.isCSV && <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs font-medium">📄 CSV</span>}
                        {lead.workshopName && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">{lead.workshopName}</span>}
                        {lead.userName && <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">👤 {lead.userName}</span>}
                      </div>
                    </div>
                    <StatusBadge status={lead.status || 'lead'} />
                  </label>
                ))
              )}
            </div>

            {/* QR timing info */}
            {selectedLeads.size > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span>🛡️</span>
                  <div className="text-sm text-green-800">
                    <strong>QR Anti-ban Mode:</strong> 45–90 second gaps between messages (SAFE preset)
                    <br />
                    <span className="text-xs text-green-700">{selectedLeads.size} msgs ≈ {Math.ceil(selectedLeads.size * 67.5 / 60)} minutes estimated</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!canProceedToStep2}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  canProceedToStep2 ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                Next: Choose Template <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Template */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                📋 Choose Template
                <span className="text-sm font-normal text-gray-500">({templates.length} QR templates)</span>
              </h2>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="🔍 Search templates..." value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 w-48 text-sm" />
                <Link href="/admin/crm/qr-templates" className="text-green-600 hover:text-green-700 text-sm font-medium whitespace-nowrap">+ New Template</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <span className="text-4xl">📝</span>
                  <p className="mt-2">No QR templates found.</p>
                  <Link href="/admin/crm/qr-templates" className="text-green-600 hover:underline mt-1 inline-block text-sm">Create a template →</Link>
                </div>
              ) : filteredTemplates.map(t => (
                <div key={t._id} onClick={() => setSelectedTemplate(t)}
                  className={`group p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedTemplate?._id === t._id ? 'bg-green-50 border-green-400 shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-green-200 hover:shadow-lg'
                  }`}>
                  {(t.headerMedia?.url) && (
                    <img src={t.headerMedia.url} alt="" className="w-full h-28 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">{t.templateName}</span>
                    {(t.headerFormat === 'IMAGE' || t.headerType === 'IMAGE') && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">🖼️ Image</span>}
                    {(t.headerFormat === 'VIDEO' || t.headerType === 'VIDEO') && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">🎥 Video</span>}
                    {t.buttons?.length ? <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">🔘 {t.buttons.length} btn</span> : null}
                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">💚 QR Ready</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{t.templateContent}</p>
                  {t.buttons && t.buttons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.buttons.slice(0,2).map((btn,i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{btn.text || btn.title}</span>
                      ))}
                    </div>
                  )}
                  {selectedTemplate?._id === t._id && <div className="mt-2 text-xs text-green-600 font-semibold">✅ Selected</div>}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 border-2 rounded-xl font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"><span>←</span> Back</button>
              <button onClick={() => setStep(3)} disabled={!canProceedToStep3}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${canProceedToStep3 ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                Next: Schedule & Send <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Schedule & Send */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Options */}
            <div className="space-y-6">
              {/* Name */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">✏️ Broadcast Name</h3>
                <input type="text" value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
                  placeholder={`QR Broadcast — ${new Date().toLocaleDateString('en-IN')}`}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>

              {/* Provider badge */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-xl border border-green-200 p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💚</span>
                  <div>
                    <div className="font-bold text-gray-800">QR WhatsApp Bridge</div>
                    <div className="text-xs text-green-600">✅ Free • Unlimited • Anti-ban protection</div>
                  </div>
                </div>
              </div>

              {/* When to send */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⏰ When to Send</h3>
                <div className="space-y-3">
                  <button onClick={() => setSendMode('now')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group ${sendMode === 'now' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">⚡</span>
                      <div><div className="font-bold text-gray-800">Send Now</div><div className="text-sm text-gray-500">Start sending immediately</div></div>
                    </div>
                  </button>
                  <button onClick={() => setSendMode('schedule')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group ${sendMode === 'schedule' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-purple-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">📅</span>
                      <div><div className="font-bold text-gray-800">Schedule</div><div className="text-sm text-gray-500">Send at specific date & time</div></div>
                    </div>
                  </button>
                  {sendMode === 'schedule' && (
                    <div className="ml-10 grid grid-cols-2 gap-3 mt-2">
                      <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-4 py-2.5 border-2 rounded-xl focus:border-purple-500" />
                      <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="px-4 py-2.5 border-2 rounded-xl focus:border-purple-500" />
                    </div>
                  )}
                  <button onClick={() => setSendMode('delay')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group ${sendMode === 'delay' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-200 hover:border-orange-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">⏱️</span>
                      <div><div className="font-bold text-gray-800">Delay</div><div className="text-sm text-gray-500">Wait before sending</div></div>
                    </div>
                  </button>
                  {sendMode === 'delay' && (
                    <div className="ml-10 flex items-center gap-3 mt-2">
                      <input type="number" min="1" max="1440" value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))} className="w-20 px-3 py-2.5 border-2 rounded-xl focus:border-orange-500" />
                      <span className="text-gray-600 font-medium">minutes from now</span>
                    </div>
                  )}
                  <button onClick={() => setSendMode('repeat')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group ${sendMode === 'repeat' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-200 hover:border-teal-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">🔁</span>
                      <div><div className="font-bold text-gray-800">Repeat</div><div className="text-sm text-gray-500">Resend on chosen days — only to delivered/read recipients after the 1st send</div></div>
                    </div>
                  </button>
                  {sendMode === 'repeat' && (
                    <div className="ml-10 mt-2 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Send Time (IST)</label>
                        <input type="time" value={repeatTime} onChange={e => setRepeatTime(e.target.value)} className="px-3 py-2 border-2 rounded-xl focus:border-blue-500 text-sm" />
                        <p className="text-xs text-gray-400 mt-1">Message is sent automatically at this time each selected day (±a few minutes), at a safe ~15 msgs/hour pace.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">📅 Repeat on these days</label>
                        <div className="flex gap-2 mb-2 flex-wrap items-center">
                          <span className="text-xs text-gray-500">Start date</span>
                          <input type="date" value={repeatStartDate} onChange={e => setRepeatStartDate(e.target.value)} className="px-2 py-1.5 border-2 rounded-lg text-sm" />
                          <span className="text-xs text-gray-500">Block size</span>
                          <input type="number" min={1} max={60} value={repeatNumDays}
                            onChange={e => setRepeatNumDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                            className="w-20 px-2 py-1.5 border-2 rounded-lg text-sm" />
                          <span className="text-xs text-gray-500">days</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <button onClick={() => setAllRepeatDays(true)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Select all</button>
                          <button onClick={() => setAllRepeatDays(false)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">Clear all</button>
                          <span className="text-xs text-gray-400 ml-auto self-center">{repeatSelectedDates.length} of {repeatNumDays} selected</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto border-2 rounded-xl p-2">
                          {repeatDateList.map(d => (
                            <label key={d} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer ${isRepeatDayChecked(d) ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'}`}>
                              <input type="checkbox" checked={isRepeatDayChecked(d)} onChange={() => toggleRepeatDay(d)} className="accent-blue-600" />
                              {fmtDayLabel(d)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Schedule Name (optional)</label>
                        <input type="text" value={repeatScheduleName} onChange={e => setRepeatScheduleName(e.target.value)}
                          placeholder={`${selectedTemplate?.templateName || 'Template'} @ ${repeatTime} (${repeatSelectedDates.length} days)`}
                          className="w-full px-3 py-2 border-2 rounded-xl focus:border-blue-500 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gap Strategy */}
              {sendMode !== 'repeat' && (
                <div className="bg-white rounded-2xl shadow-xl border p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🛡️ Anti-ban Speed</h3>
                  <div className="space-y-2">
                    {Object.entries(GAP_PRESETS).map(([key, p]) => (
                      <label key={key} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${gapPreset === key ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <input type="radio" name="gap" value={key} checked={gapPreset === key} onChange={() => setGapPreset(key)} className="mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{p.label} <span className="font-normal text-gray-500">({p.desc})</span></div>
                          <div className="text-xs text-gray-500">{p.safe} · {p.minS}–{p.maxS}s between messages</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Preview & Summary */}
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Summary</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{selectedLeads.size}</div>
                    <div className="text-sm text-green-700">Recipients</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600">{sendMode === 'now' ? '⚡' : sendMode === 'schedule' ? '📅' : sendMode === 'repeat' ? '🔁' : '⏱️'}</div>
                    <div className="text-sm text-emerald-700 capitalize">{sendMode}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-600">Template:</span><span className="font-medium text-gray-800">{selectedTemplate?.templateName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Provider:</span><span className="font-medium text-gray-800">💚 QR WhatsApp</span></div>
                  {sendMode !== 'repeat' && (
                    <div className="flex justify-between"><span className="text-gray-600">Speed:</span><span className="font-medium text-gray-800">{GAP_PRESETS[gapPreset]?.label}</span></div>
                  )}
                  {sendMode === 'schedule' && scheduleDate && scheduleTime && (
                    <div className="flex justify-between"><span className="text-gray-600">Scheduled:</span><span className="font-medium text-gray-800">{new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-IN')}</span></div>
                  )}
                  {sendMode === 'repeat' && (
                    <>
                      <div className="flex justify-between"><span className="text-gray-600">Time:</span><span className="font-medium text-gray-800">{repeatTime} IST</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Days:</span><span className="font-medium text-gray-800">{repeatSelectedDates.length} of {repeatNumDays}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-white rounded-2xl shadow-xl border p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">👁️ Message Preview</h3>
                  <div className="bg-[#0b141a] rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-3 text-center">WhatsApp QR (Bridge)</p>
                    <div className="bg-[#025c4c] rounded-2xl overflow-hidden max-w-xs mx-auto shadow-xl">
                      {selectedTemplate.headerMedia?.url && (
                        <div className="relative">
                          <img src={selectedTemplate.headerMedia.url} alt="" className="w-full h-40 object-cover" />
                          <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-0.5 rounded text-xs text-white">📷 Image</div>
                        </div>
                      )}
                      <div className="bg-[#005c4b] p-4">
                        <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{selectedTemplate.templateContent}</p>
                        {selectedTemplate.buttons?.length ? (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            {selectedTemplate.buttons.map((btn, i) => (
                              <p key={i} className="text-white/90 text-sm py-1">📌 {btn.text || btn.title}</p>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex justify-end mt-2">
                          <span className="text-xs text-white/60">{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} ✓✓</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white">💚 QR Bridge</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2 rounded-lg ${selectedTemplate.headerMedia?.url ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <span className="text-lg">{selectedTemplate.headerMedia?.url ? '✅' : '➖'}</span>
                        <p className="text-xs text-gray-300">Image</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500/20"><span className="text-lg">✅</span><p className="text-xs text-gray-300">Body</p></div>
                      <div className={`p-2 rounded-lg ${selectedTemplate.buttons?.length ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <span className="text-lg">{selectedTemplate.buttons?.length ? '✅' : '➖'}</span>
                        <p className="text-xs text-gray-300">Buttons</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 px-5 py-3 border-2 rounded-xl font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"><span>←</span> Back</button>
                <button onClick={handleSend} disabled={!canSend || sending}
                  className={`flex-1 px-5 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${canSend && !sending ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {sending ? <><span className="animate-spin">⏳</span> {sendMode === 'repeat' ? 'Saving...' : 'Sending...'}</> : <>{sendMode === 'repeat' ? '🔁 Create Schedule' : <>🚀 {sendMode === 'now' ? 'Send Now' : sendMode === 'schedule' ? 'Schedule' : 'Queue'}</>}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
