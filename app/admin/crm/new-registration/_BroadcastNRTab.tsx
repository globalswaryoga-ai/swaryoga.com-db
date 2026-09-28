'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Clock, CheckCircle, UserCheck, Video,
  Send, RefreshCw, X, Zap, Calendar,
  MessageSquare, QrCode, Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/admin/crm/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Template {
  _id: string;
  templateName?: string;
  name?: string;
  templateContent?: string;
  bodyText?: string;
  language?: string;
  status?: string;
  provider?: string;
}

type SendMode = 'now' | 'schedule';
type ProviderMode = 'meta' | 'qr' | 'group';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'kn', name: 'Kannada' },
];

const LEAD_SEGMENTS = [
  { id: 'new_leads',  label: 'New Leads',        icon: FileText,    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'pending_1',  label: 'Pending-1',         icon: Clock,       color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'pending_2',  label: 'Pending-2',         icon: Clock,       color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'pending_3',  label: 'Pending-3',         icon: Clock,       color: 'text-red-400 bg-red-50 border-red-200' },
  { id: 'approval_1', label: 'Approval-1',        icon: CheckCircle, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'approval_2', label: 'Approval-2',        icon: CheckCircle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'registered', label: 'Registered',        icon: UserCheck,   color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'take_zoom',  label: 'Take Zoom Meeting', icon: Video,       color: 'text-teal-600 bg-teal-50 border-teal-200' },
];

function countLeadsBySegment(segmentId: string, batchLeads: any[], batchDecisions: Record<string, any>): number {
  if (!batchLeads.length) return 0;
  switch (segmentId) {
    case 'new_leads':  return batchLeads.filter(l => !batchDecisions[l.id || l._id]).length;
    case 'pending_1':  return batchLeads.filter(l => batchDecisions[l.id || l._id]?.status === 'pending_1').length;
    case 'pending_2':  return batchLeads.filter(l => batchDecisions[l.id || l._id]?.status === 'pending_2').length;
    case 'pending_3':  return batchLeads.filter(l => batchDecisions[l.id || l._id]?.status === 'pending_3').length;
    case 'approval_1': return batchLeads.filter(l => batchDecisions[l.id || l._id]?.status === 'approval_1').length;
    case 'approval_2': return batchLeads.filter(l => batchDecisions[l.id || l._id]?.status === 'approval_2').length;
    case 'registered': return batchLeads.filter(l => batchDecisions[l.id || l._id]?.isRegistered).length;
    case 'take_zoom':  return batchLeads.filter(l => batchDecisions[l.id || l._id]?.hasMeetingSlot).length;
    default:           return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function BroadcastNRTab({
  workshops = [],
  leadsData = [],
}: {
  workshops?: any[];
  leadsData?: any[];
}) {
  const token = useAuth();
  const toast = useToast();

  // Sidebar State
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [providerMode, setProviderMode] = useState<ProviderMode>('meta');
  const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>({});

  useEffect(() => {
    const raw = localStorage.getItem('crm_batch_decisions');
    if (raw) { try { setBatchDecisions(JSON.parse(raw)); } catch (_) {} }
  }, []);

  const activeBatch = workshops.find(w => w.id === selectedBatchId);

  const activeBatchLeads = useMemo(() => {
    if (!activeBatch?.formFilterKeyword || !leadsData.length) return [];
    const keywords = activeBatch.formFilterKeyword.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
    const ai7 = activeBatch?.metadata?.googleFormMapping?.['AI-7'];
    return leadsData.filter((lead: any) => {
      if (lead._rawRecord) {
        if (ai7 && lead._rawRecord[ai7]) return keywords.some((k: string) => String(lead._rawRecord[ai7]).toLowerCase().includes(k));
        return keywords.some((k: string) => Object.values(lead._rawRecord).some(v => String(v).toLowerCase().includes(k)));
      }
      return true;
    });
  }, [activeBatch, leadsData]);

  // Broadcast State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [broadcastName, setBroadcastName] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [showRuns, setShowRuns] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    try {
      const provider = providerMode === 'group' ? 'qr' : providerMode;
      const res = await fetch(`/api/admin/crm/templates?provider=${provider}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTemplates(data.templates || data.data?.templates || []);
    } catch (_) {}
  }, [token, providerMode]);

  const fetchRuns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs?limit=8', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRecentRuns(data.runs || data.data?.runs || []);
    } catch (_) {}
  }, [token]);

  useEffect(() => { fetchTemplates(); fetchRuns(); }, [fetchTemplates, fetchRuns]);

  const targetLeads = useMemo(() => {
    if (!selectedSegment) return activeBatchLeads;
    return activeBatchLeads.filter((l: any) => {
      const d = batchDecisions[l.id || l._id];
      switch (selectedSegment) {
        case 'new_leads':  return !d;
        case 'pending_1':  return d?.status === 'pending_1';
        case 'pending_2':  return d?.status === 'pending_2';
        case 'pending_3':  return d?.status === 'pending_3';
        case 'approval_1': return d?.status === 'approval_1';
        case 'approval_2': return d?.status === 'approval_2';
        case 'registered': return d?.isRegistered;
        case 'take_zoom':  return d?.hasMeetingSlot;
        default:           return true;
      }
    });
  }, [selectedSegment, activeBatchLeads, batchDecisions]);

  const handleSend = async () => {
    if (!selectedTemplate) { toast.error('Please select a template first'); return; }
    if (targetLeads.length === 0) { toast.error('No leads in selected segment'); return; }
    if (!selectedBatchId) { toast.error('Please select a batch first'); return; }
    if (sendMode === 'schedule' && (!scheduleDate || !scheduleTime)) { toast.error('Please select schedule date and time'); return; }

    setSending(true);
    setResult(null);
    try {
      const recipientPhones = targetLeads.map((l: any) => l.phoneNumber || l.phone).filter(Boolean);
      const payload: any = {
        broadcastName: broadcastName || `${activeBatch?.name || 'Batch'} - ${selectedSegment || 'All'} - ${new Date().toLocaleDateString('en-IN')}`,
        templateId: selectedTemplate._id,
        provider: providerMode === 'group' ? 'qr' : providerMode,
        recipientPhones,
        sendMode,
      };
      if (sendMode === 'schedule') payload.scheduledFor = `${scheduleDate}T${scheduleTime}:00`;

      const res = await fetch('/api/admin/crm/broadcast-runs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');

      const msg = sendMode === 'schedule'
        ? `Scheduled for ${scheduleDate} ${scheduleTime} to ${recipientPhones.length} leads!`
        : `Sent to ${recipientPhones.length} leads!`;
      setResult({ success: true, message: msg });
      toast.success(msg);
      fetchRuns();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send broadcast';
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 6000);
    }
  };

  const filteredTemplates = templates.filter(t => !selectedLang || t.language === selectedLang);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50/50">
      {/* LEFT SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Broadcast Setup</h3>
        </div>
        <div className="flex-1 p-4 space-y-5">
          {/* Provider Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">WhatsApp Provider</label>
            <div className="flex gap-2">
              {([
                { id: 'meta' as ProviderMode, label: 'Meta', icon: MessageSquare },
                { id: 'qr' as ProviderMode, label: 'QR', icon: QrCode },
                { id: 'group' as ProviderMode, label: 'Group', icon: Users },
              ]).map(p => (
                <button key={p.id} onClick={() => { setProviderMode(p.id); setSelectedTemplate(null); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                    providerMode === p.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  <p.icon size={14} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Language</label>
            <select value={selectedLang} onChange={e => { setSelectedLang(e.target.value); setSelectedTemplate(null); }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-500">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Batch</label>
            <select value={selectedBatchId} onChange={e => { setSelectedBatchId(e.target.value); setSelectedSegment(null); }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-500">
              <option value="">-- Choose a batch --</option>
              {workshops.filter(w => w.id?.startsWith('batch_')).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Lead Segments */}
          {selectedBatchId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Leads</label>
              <div className="space-y-1.5">
                <button onClick={() => setSelectedSegment(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    !selectedSegment ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <span>All Leads</span>
                  <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{activeBatchLeads.length}</span>
                </button>
                {LEAD_SEGMENTS.map(seg => {
                  const count = countLeadsBySegment(seg.id, activeBatchLeads, batchDecisions);
                  return (
                    <button key={seg.id} onClick={() => setSelectedSegment(seg.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        selectedSegment === seg.id ? `${seg.color} border-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                      <span className="flex items-center gap-2"><seg.icon size={13} />{seg.label}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${count > 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Template Info */}
          {selectedTemplate && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-bold text-green-700 mb-1">Template Selected</p>
              <p className="text-xs text-green-600 truncate">{selectedTemplate.templateName || selectedTemplate.name}</p>
              <button onClick={() => setSelectedTemplate(null)} className="text-xs text-red-500 mt-1 hover:underline">Remove</button>
            </div>
          )}

          {/* Send Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Send Mode</label>
            <div className="flex gap-2">
              <button onClick={() => setSendMode('now')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${sendMode === 'now' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'}`}>
                <Zap size={12} className="inline mr-1" />Now
              </button>
              <button onClick={() => setSendMode('schedule')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${sendMode === 'schedule' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                <Calendar size={12} className="inline mr-1" />Schedule
              </button>
            </div>
          </div>

          {sendMode === 'schedule' && (
            <div className="space-y-2">
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}

          {/* Broadcast Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Broadcast Name</label>
            <input type="text" value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
              placeholder="e.g. Sep Batch - New Leads"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500" />
          </div>

          {/* Submit */}
          <button onClick={handleSend} disabled={sending || !selectedTemplate || targetLeads.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black shadow-md flex items-center justify-center gap-2 transition-all">
            {sending
              ? <><RefreshCw size={16} className="animate-spin" /> Sending...</>
              : <><Send size={16} />{sendMode === 'schedule' ? 'Schedule' : 'Send Now'} ({targetLeads.length})</>
            }
          </button>

          {result && (
            <div className={`rounded-xl p-3 text-sm font-medium ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.message}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">Broadcast — New Registration</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedBatchId
                ? <><strong className="text-slate-700">{activeBatch?.name}</strong> · <strong className="text-green-700">{targetLeads.length}</strong> leads {selectedSegment && `(${LEAD_SEGMENTS.find(s => s.id === selectedSegment)?.label})`}</>
                : 'Select a batch and target segment from the sidebar to start'}
            </p>
          </div>
          <button onClick={() => { fetchRuns(); setShowRuns(!showRuns); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={14} /> Recent Runs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recent Runs */}
          {showRuns && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-700 text-sm">Recent Broadcast Runs</h3>
                <button onClick={() => setShowRuns(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              {recentRuns.length === 0
                ? <p className="p-6 text-center text-sm text-slate-400">No recent runs</p>
                : (
                  <div className="divide-y divide-slate-100">
                    {recentRuns.map(run => (
                      <div key={run._id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-slate-700">{run.name}</p>
                          <p className="text-xs text-slate-400">{new Date(run.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-600 font-bold">sent {run.stats?.sent || 0}</span>
                          <span className="text-red-500 font-bold">fail {run.stats?.failed || 0}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                            run.status === 'completed' ? 'bg-green-100 text-green-700'
                            : run.status === 'scheduled' ? 'bg-indigo-100 text-indigo-700'
                            : run.status === 'running' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>{run.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Templates Grid */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-slate-700">
                Select Template
                <span className="ml-2 text-xs font-medium text-slate-400 capitalize">
                  ({providerMode} · {LANGUAGES.find(l => l.code === selectedLang)?.name})
                </span>
              </h3>
              <button onClick={fetchTemplates} className="text-xs font-bold text-slate-500 hover:text-green-600 flex items-center gap-1">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-bold">No templates found</p>
                <p className="text-xs mt-1">Create templates in the Template tab, or change language/provider filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTemplates.map(t => (
                  <div key={t._id} onClick={() => setSelectedTemplate(t._id === selectedTemplate?._id ? null : t)}
                    className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?._id === t._id ? 'border-green-500 ring-2 ring-green-100 shadow-md' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-sm pr-2 line-clamp-1">{t.templateName || t.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        t.status === 'approved' ? 'bg-green-100 text-green-700'
                        : t.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {t.templateContent || t.bodyText}
                    </p>
                    {selectedTemplate?._id === t._id && (
                      <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Broadcast Summary */}
          {selectedTemplate && selectedBatchId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <h3 className="font-black text-indigo-800 mb-3">Broadcast Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-slate-400">Batch</p>
                  <p className="font-bold text-slate-700 truncate">{activeBatch?.name}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-slate-400">Segment</p>
                  <p className="font-bold text-slate-700">{selectedSegment ? LEAD_SEGMENTS.find(s => s.id === selectedSegment)?.label : 'All Leads'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-slate-400">Recipients</p>
                  <p className="font-black text-green-700 text-lg">{targetLeads.length}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-slate-400">Mode</p>
                  <p className="font-bold text-slate-700 capitalize">
                    {sendMode === 'schedule' ? `${scheduleDate} ${scheduleTime}` : 'Immediately'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
