'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
}

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
  headerFormat?: string;
  headerMedia?: { kind: string; url: string };
  buttons?: { kind: string; title: string; url?: string }[];
  language?: string;
  status?: string;
}

interface BroadcastRun {
  _id: string;
  name: string;
  status: string;
  provider: string;
  stats: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  templateSnapshot?: {
    templateName?: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface QuotaStatus {
  date: string;
  sent: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical' | 'exhausted';
  canSend: boolean;
  estimatedDeliveryTime?: string;
}

interface BulkStats {
  today: { sent: number; failed: number; pending: number };
  thisWeek: { sent: number; failed: number };
  thisMonth: { sent: number; failed: number };
  quota: QuotaStatus;
  activeRuns: number;
}

interface BroadcastValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedTime: string;
  quotaAfterSend: number;
}

type SendMode = 'now' | 'schedule' | 'delay';
type Provider = 'meta' | 'qr';
type Step = 1 | 2 | 3;

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================
function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const configs: Record<string, { bg: string; text: string; icon: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📝' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📅' },
    running: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🔄' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⏳' },
    sent: { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
    skipped: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⏭️' },
  };
  const config = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: '•' };
  const sizeClasses = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{status}</span>
    </span>
  );
}

function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${colorMap[color] || 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BroadcastPage() {
  const token = useAuth();

  // Step management
  const [step, setStep] = useState<Step>(1);
  
  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentRuns, setRecentRuns] = useState<BroadcastRun[]>([]);
  
  // Selection
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Options
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(2);
  const [minIntervalSeconds, setMinIntervalSeconds] = useState(30);  // Min delay between messages
  const [maxIntervalSeconds, setMaxIntervalSeconds] = useState(60);  // Max delay between messages
  const [provider, setProvider] = useState<Provider>('meta');
  const [broadcastName, setBroadcastName] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  const [filterAssignedUser, setFilterAssignedUser] = useState('all');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; runId?: string } | null>(null);
  const [showRecentRuns, setShowRecentRuns] = useState(false);
  const [showQuotaDashboard, setShowQuotaDashboard] = useState(true);
  
  // Bulk Messaging State
  const [bulkStats, setBulkStats] = useState<BulkStats | null>(null);
  const [validation, setValidation] = useState<BroadcastValidation | null>(null);
  const [processingRuns, setProcessingRuns] = useState<any[]>([]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [leadsRes, templatesRes, runsRes, bulkRes] = await Promise.all([
        fetch('/api/admin/crm/leads?limit=1000', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/templates', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/broadcast-runs?limit=10', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/bulk-status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const [leadsData, templatesData, runsData, bulkData] = await Promise.all([
        leadsRes.json(),
        templatesRes.json(),
        runsRes.json(),
        bulkRes.json(),
      ]);
      
      setLeads(leadsData.data?.leads || leadsData.leads || []);
      setTemplates(templatesData.data?.templates || templatesData.templates || []);
      setRecentRuns(runsData.data?.runs || runsData.runs || []);
      if (bulkData.success) setBulkStats(bulkData.data);
    } catch (err) {
      console.error('[Broadcast] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch active processing runs
  const fetchActiveProgress = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/bulk-status?action=progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProcessingRuns(data.data || []);
    } catch (err) {
      console.error('[Broadcast] Failed to fetch progress:', err);
    }
  }, [token]);

  // Validate broadcast when selection changes
  const validateSelection = useCallback(async () => {
    if (!token || selectedLeads.size === 0) {
      setValidation(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/crm/bulk-status?action=validate&count=${selectedLeads.size}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setValidation(data.data);
    } catch (err) {
      console.error('[Broadcast] Validation failed:', err);
    }
  }, [token, selectedLeads.size]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh progress every 5 seconds when there are active runs
  useEffect(() => {
    fetchActiveProgress();
    const interval = setInterval(() => {
      if (processingRuns.some(r => r.status === 'processing')) {
        fetchActiveProgress();
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveProgress, fetchData, processingRuns]);

  // Validate when selection changes
  useEffect(() => {
    validateSelection();
  }, [validateSelection]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phoneNumber.includes(searchQuery);
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesWorkshop = filterWorkshop === 'all' || lead.workshopName === filterWorkshop;
      const matchesUser = filterAssignedUser === 'all' || lead.assignedToUserId === filterAssignedUser;
      return matchesSearch && matchesStatus && matchesWorkshop && matchesUser;
    });
  }, [leads, searchQuery, filterStatus, filterWorkshop, filterAssignedUser]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates;
    return templates.filter(t => 
      t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.templateContent.toLowerCase().includes(templateSearch.toLowerCase())
    );
  }, [templates, templateSearch]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map(l => l.status || 'lead'));
    return Array.from(statuses).sort();
  }, [leads]);

  const uniqueWorkshops = useMemo(() => {
    const workshops = new Set(leads.map(l => l.workshopName).filter(Boolean));
    return Array.from(workshops).sort() as string[];
  }, [leads]);

  const uniqueAssignedUsers = useMemo(() => {
    const usersMap = new Map<string, string>();
    leads.forEach(l => {
      if (l.assignedToUserId) {
        // Use userName if available, otherwise use assignedToUserId
        usersMap.set(l.assignedToUserId, l.userName || l.assignedToUserId);
      }
    });
    return Array.from(usersMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [leads]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================
  const toggleLead = useCallback((id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedLeads(prev => {
      if (prev.size === filteredLeads.length) {
        return new Set();
      }
      return new Set(filteredLeads.map(l => l._id));
    });
  }, [filteredLeads]);

  const clearSelection = useCallback(() => {
    setSelectedLeads(new Set());
  }, []);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const canProceedToStep2 = selectedLeads.size > 0;
  const canProceedToStep3 = selectedTemplate !== null;
  const canSend = useMemo(() => {
    if (!selectedTemplate || selectedLeads.size === 0) return false;
    if (sendMode === 'schedule' && (!scheduleDate || !scheduleTime)) return false;
    return true;
  }, [selectedTemplate, selectedLeads, sendMode, scheduleDate, scheduleTime]);

  // ============================================================================
  // SEND BROADCAST
  // ============================================================================
  const handleSend = async () => {
    if (!canSend || !selectedTemplate) return;
    
    setSending(true);
    setResult(null);

    try {
      // Prepare payload
      let mode = sendMode;
      let scheduleAt: string | undefined;
      let delayMins: number | undefined;

      if (sendMode === 'schedule') {
        if (!scheduleDate || !scheduleTime) {
          throw new Error('Please select date and time for scheduling');
        }
        scheduleAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      } else if (sendMode === 'delay') {
        delayMins = delayMinutes;
      }

      const payload = {
        name: broadcastName.trim() || `Broadcast - ${new Date().toLocaleString('en-IN')}`,
        templateId: selectedTemplate._id,
        mode,
        provider,
        scheduleAt,
        delayMins,
        messageInterval: {
          minSeconds: minIntervalSeconds,
          maxSeconds: maxIntervalSeconds,
        },
        target: {
          type: 'leadIds',
          leadIds: Array.from(selectedLeads),
        },
      };

      console.log('[Broadcast] Creating run with payload:', payload);

      // Create broadcast run
      const createRes = await fetch('/api/admin/crm/broadcast-runs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();
      
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Failed to create broadcast run');
      }

      const runId = createData.data?._id;
      console.log('[Broadcast] Created run:', runId);

      // If sending now, trigger the run processor
      if (mode === 'now' && runId) {
        console.log('[Broadcast] Triggering immediate run...');
        
        const runRes = await fetch('/api/admin/crm/broadcast-runs/run', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ runLimit: 1 }),
        });

        const runData = await runRes.json();
        console.log('[Broadcast] Run result:', runData);

        if (runData.success) {
          const stats = runData.data;
          setResult({
            success: true,
            message: `✅ Broadcast started! Sent: ${stats.sent || 0}, Failed: ${stats.failed || 0}, Skipped: ${stats.skipped || 0}`,
            runId,
          });
        } else {
          setResult({
            success: true,
            message: `✅ Broadcast created and queued for processing.`,
            runId,
          });
        }
      } else {
        setResult({
          success: true,
          message: `✅ Broadcast ${mode === 'schedule' ? 'scheduled' : 'created'}! ${selectedLeads.size} recipients.`,
          runId,
        });
      }

      // Reset form
      setSelectedLeads(new Set());
      setSelectedTemplate(null);
      setBroadcastName('');
      setStep(1);
      
      // Refresh runs list
      fetchData();

    } catch (err: any) {
      console.error('[Broadcast] Error:', err);
      setResult({
        success: false,
        message: `❌ ${err.message || 'Failed to send broadcast'}`,
      });
    } finally {
      setSending(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[
        { num: 1, label: 'Recipients', icon: '👥' },
        { num: 2, label: 'Template', icon: '📋' },
        { num: 3, label: 'Send', icon: '🚀' },
      ].map((s, i) => (
        <div key={s.num} className="flex items-center">
          <button
            onClick={() => {
              if (s.num === 1 || (s.num === 2 && canProceedToStep2) || (s.num === 3 && canProceedToStep2 && canProceedToStep3)) {
                setStep(s.num as Step);
              }
            }}
            disabled={s.num === 2 && !canProceedToStep2 || s.num === 3 && (!canProceedToStep2 || !canProceedToStep3)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${
              step === s.num
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : step > s.num
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
            } ${(s.num === 2 && !canProceedToStep2) || (s.num === 3 && (!canProceedToStep2 || !canProceedToStep3)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-lg">{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
            {step > s.num && <span className="text-green-600 font-bold">✓</span>}
          </button>
          {i < 2 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  if (token === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700 transition-all hover:-translate-x-1 flex items-center gap-1">
                <span>←</span> <span className="hidden sm:inline">CRM</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📢 Broadcast Center
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowQuotaDashboard(!showQuotaDashboard)}
                className={`px-3 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1 ${
                  showQuotaDashboard ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                📈 <span className="hidden sm:inline">Quota</span>
              </button>
              <Link href="/admin/crm/send-template" className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium hidden sm:flex items-center gap-1">
                📨 Single
              </Link>
              <Link href="/admin/crm/reports/meta" className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-sm font-medium flex items-center gap-1">
                🟢 <span className="hidden sm:inline">Reports</span>
              </Link>
              <button
                onClick={() => setShowRecentRuns(!showRecentRuns)}
                className={`px-3 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1 ${
                  showRecentRuns ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                📊 <span className="hidden sm:inline">History</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Result Alert */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-center justify-between ${
            result.success 
              ? 'bg-green-50 border-green-300 text-green-800' 
              : 'bg-red-50 border-red-300 text-red-800'
          }`}>
            <span className="font-medium">{result.message}</span>
            <div className="flex items-center gap-2">
              {result.runId && (
                <Link
                  href={`/admin/crm/reports/meta?runId=${result.runId}`}
                  className="text-sm underline hover:no-underline"
                >
                  View Details →
                </Link>
              )}
              <button onClick={() => setResult(null)} className="text-lg hover:opacity-70">×</button>
            </div>
          </div>
        )}

        {/* Bulk Messaging Dashboard */}
        {showQuotaDashboard && bulkStats && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                📊 Bulk Messaging Dashboard
                <span className="text-xs font-normal text-gray-500">10,000 msgs/day capacity</span>
              </h3>
              <button
                onClick={() => setShowQuotaDashboard(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >×</button>
            </div>
            
            {/* Quota Bar */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Daily Quota</span>
                <span className={`text-sm font-bold ${
                  bulkStats.quota.status === 'exhausted' ? 'text-red-600' :
                  bulkStats.quota.status === 'critical' ? 'text-orange-600' :
                  bulkStats.quota.status === 'warning' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {bulkStats.quota.sent.toLocaleString()} / {bulkStats.quota.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    bulkStats.quota.status === 'exhausted' ? 'bg-red-500' :
                    bulkStats.quota.status === 'critical' ? 'bg-orange-500' :
                    bulkStats.quota.status === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, bulkStats.quota.percentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-500">
                  {bulkStats.quota.remaining.toLocaleString()} remaining
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  bulkStats.quota.status === 'exhausted' ? 'bg-red-100 text-red-700' :
                  bulkStats.quota.status === 'critical' ? 'bg-orange-100 text-orange-700' :
                  bulkStats.quota.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {bulkStats.quota.status === 'exhausted' ? '⛔ Exhausted' :
                   bulkStats.quota.status === 'critical' ? '⚠️ Critical' :
                   bulkStats.quota.status === 'warning' ? '⚡ Warning' :
                   '✅ Normal'}
                </span>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-green-600">{bulkStats.today.sent.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Sent Today</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-red-600">{bulkStats.today.failed.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Failed Today</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-blue-600">{bulkStats.today.pending.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-purple-600">{bulkStats.activeRuns}</div>
                <div className="text-xs text-gray-500">Active Runs</div>
              </div>
            </div>
            
            {/* Active Processing Runs */}
            {processingRuns.length > 0 && processingRuns.some(r => r.status === 'processing') && (
              <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="animate-pulse">🔄</span> Active Broadcasts
                </h4>
                <div className="space-y-3">
                  {processingRuns.filter(r => r.status === 'processing').map(run => (
                    <div key={run.runId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800 text-sm">Batch {run.currentBatch}/{run.totalBatches}</span>
                        <span className="text-sm text-blue-600 font-medium">{run.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${run.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>✓ {run.sent} sent • ✗ {run.failed} failed</span>
                        <span>⏱️ ~{run.estimatedTimeRemaining} left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validation && validation.warnings.length > 0 && selectedLeads.size > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span>⚠️</span>
                  <div className="text-sm text-yellow-800">
                    {validation.warnings.map((w, i) => <div key={i}>{w}</div>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Runs Panel */}
        {showRecentRuns && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg border p-4 animate-fadeIn">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              📊 Recent Broadcasts
              <button onClick={fetchData} className="text-blue-600 hover:text-blue-700 text-sm font-normal">
                ↻ Refresh
              </button>
            </h3>
            {recentRuns.length === 0 ? (
              <p className="text-gray-500 text-sm">No broadcasts yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentRuns.map(run => (
                  <div key={run._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{run.provider === 'meta' ? '🟢' : '💚'}</span>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{run.name}</div>
                        <div className="text-xs text-gray-500">
                          {run.templateSnapshot?.templateName || 'Template'} • {new Date(run.createdAt).toLocaleString('en-IN')}
                        </div>
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

        {/* Step 1: Recipients */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border p-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                👥 Select Recipients
                <span className="text-sm font-normal text-gray-500">({filteredLeads.length} available)</span>
              </h2>
              <input
                type="text"
                placeholder="🔍 Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-56 text-sm"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600 mr-1">🎯 Filter:</span>
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white min-w-[120px]"
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Workshop Filter */}
              {uniqueWorkshops.length > 0 && (
                <select
                  value={filterWorkshop}
                  onChange={(e) => setFilterWorkshop(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white min-w-[140px]"
                >
                  <option value="all">All Workshops</option>
                  {uniqueWorkshops.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}

              {/* Assigned User Filter */}
              {uniqueAssignedUsers.length > 0 && (
                <select
                  value={filterAssignedUser}
                  onChange={(e) => setFilterAssignedUser(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white min-w-[140px]"
                >
                  <option value="all">All Users</option>
                  {uniqueAssignedUsers.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}

              {/* Clear Filters */}
              {(filterStatus !== 'all' || filterWorkshop !== 'all' || filterAssignedUser !== 'all') && (
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterWorkshop('all');
                    setFilterAssignedUser('all');
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Selection Bar */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={selectAllFiltered}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-blue-800 group-hover:text-blue-600 transition-colors">
                  Select All ({filteredLeads.length})
                </span>
              </label>
              <div className="flex items-center gap-4">
                {selectedLeads.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600">{selectedLeads.size}</span>
                  <span className="text-blue-700 text-sm">selected</span>
                </div>
              </div>
            </div>

            {/* Leads List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin text-4xl mb-2">⏳</div>
                  Loading leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <span className="text-4xl">👤</span>
                  <p className="mt-2">No leads found</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <label
                    key={lead._id}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                      selectedLeads.has(lead._id)
                        ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                        : 'bg-gray-50/50 border-2 border-transparent hover:bg-white hover:shadow-sm hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead._id)}
                      onChange={() => toggleLead(lead._id)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {lead.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{lead.phoneNumber}</span>
                        {lead.workshopName && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">
                            {lead.workshopName}
                          </span>
                        )}
                        {lead.userName && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                            👤 {lead.userName}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={lead.status || 'lead'} />
                  </label>
                ))
              )}
            </div>

            {/* Next Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  canProceedToStep2
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next: Choose Template
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl border p-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                📋 Choose Template
                <span className="text-sm font-normal text-gray-500">({templates.length} available)</span>
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 text-sm"
                />
                <Link href="/admin/crm/templates" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
                  + New
                </Link>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <span className="text-4xl">📝</span>
                  <p className="mt-2">No templates found. Create one first.</p>
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`group p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                      selectedTemplate?._id === t._id
                        ? 'bg-blue-50 border-blue-400 shadow-lg scale-[1.02]'
                        : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg'
                    }`}
                  >
                    {t.headerMedia?.url && (
                      <img
                        src={t.headerMedia.url}
                        alt=""
                        className="w-full h-28 object-cover rounded-lg mb-3"
                      />
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {t.templateName}
                      </span>
                      {t.headerFormat === 'IMAGE' && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">🖼️</span>
                      )}
                      {t.buttons?.length ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">🔘 {t.buttons.length}</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{t.templateContent}</p>
                    {t.buttons && t.buttons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.buttons.slice(0, 2).map((btn, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {btn.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border-2 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
              >
                <span>←</span> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  canProceedToStep3
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next: Schedule & Send
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Send */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            {/* Left: Options */}
            <div className="space-y-6">
              {/* Broadcast Name */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  ✏️ Broadcast Name
                </h3>
                <input
                  type="text"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  placeholder={`Broadcast - ${new Date().toLocaleDateString('en-IN')}`}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Provider Selection */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📡 Provider
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProvider('meta')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md group ${
                      provider === 'meta' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🟢</div>
                    <div className="font-bold text-gray-800">Meta WhatsApp</div>
                    <div className="text-xs text-green-600 mt-1">✅ Native Buttons</div>
                  </button>
                  <button
                    onClick={() => setProvider('qr')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md group ${
                      provider === 'qr' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💚</div>
                    <div className="font-bold text-gray-800">QR Bridge</div>
                    <div className="text-xs text-orange-600 mt-1">📝 Text Buttons</div>
                  </button>
                </div>
              </div>

              {/* Send Mode */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  ⏰ When to Send
                </h3>
                <div className="space-y-3">
                  {/* Now */}
                  <button
                    onClick={() => setSendMode('now')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md group ${
                      sendMode === 'now' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">⚡</span>
                      <div>
                        <div className="font-bold text-gray-800">Send Now</div>
                        <div className="text-sm text-gray-500">Start sending immediately</div>
                      </div>
                    </div>
                  </button>

                  {/* Schedule */}
                  <button
                    onClick={() => setSendMode('schedule')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md group ${
                      sendMode === 'schedule' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">📅</span>
                      <div>
                        <div className="font-bold text-gray-800">Schedule</div>
                        <div className="text-sm text-gray-500">Send at specific date & time</div>
                      </div>
                    </div>
                  </button>
                  {sendMode === 'schedule' && (
                    <div className="ml-10 grid grid-cols-2 gap-3 mt-2">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="px-4 py-2.5 border-2 rounded-xl focus:border-purple-500"
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="px-4 py-2.5 border-2 rounded-xl focus:border-purple-500"
                      />
                    </div>
                  )}

                  {/* Delay */}
                  <button
                    onClick={() => setSendMode('delay')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md group ${
                      sendMode === 'delay' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform">⏱️</span>
                      <div>
                        <div className="font-bold text-gray-800">Delay</div>
                        <div className="text-sm text-gray-500">Wait before sending</div>
                      </div>
                    </div>
                  </button>
                  {sendMode === 'delay' && (
                    <div className="ml-10 flex items-center gap-3 mt-2">
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={delayMinutes}
                        onChange={(e) => setDelayMinutes(Number(e.target.value))}
                        className="w-20 px-3 py-2.5 border-2 rounded-xl focus:border-orange-500"
                      />
                      <span className="text-gray-600 font-medium">minutes from now</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Interval Settings - Following WhatsApp Guidelines */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  ⏱️ Message Interval (WhatsApp Safety)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Random delay between messages to avoid WhatsApp spam detection. Higher values are safer.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Min Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum (seconds)
                    </label>
                    <select
                      value={minIntervalSeconds}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMinIntervalSeconds(val);
                        if (val > maxIntervalSeconds) setMaxIntervalSeconds(val);
                      }}
                      className="w-full px-3 py-2.5 border-2 rounded-xl focus:border-blue-500 bg-white"
                    >
                      {[5, 10, 15, 20, 30, 45, 60, 90, 120].map(sec => (
                        <option key={sec} value={sec}>{sec} seconds</option>
                      ))}
                    </select>
                  </div>
                  {/* Max Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum (seconds)
                    </label>
                    <select
                      value={maxIntervalSeconds}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMaxIntervalSeconds(val);
                        if (val < minIntervalSeconds) setMinIntervalSeconds(val);
                      }}
                      className="w-full px-3 py-2.5 border-2 rounded-xl focus:border-blue-500 bg-white"
                    >
                      {[10, 15, 20, 30, 45, 60, 90, 120, 180, 300].map(sec => (
                        <option key={sec} value={sec}>{sec} seconds</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>
                      <strong>WhatsApp Guideline:</strong> Keep minimum at 30+ seconds to avoid account restrictions. 
                      Sending too fast may result in temporary bans.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Preview & Summary */}
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-2xl shadow-xl border p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📊 Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{selectedLeads.size}</div>
                    <div className="text-sm text-blue-700">Recipients</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {sendMode === 'now' ? '⚡' : sendMode === 'schedule' ? '📅' : '⏱️'}
                    </div>
                    <div className="text-sm text-purple-700 capitalize">{sendMode}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Template:</span>
                    <span className="font-medium text-gray-800">{selectedTemplate?.templateName}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium text-gray-800">{provider === 'meta' ? '🟢 Meta' : '💚 QR'}</span>
                  </div>
                  {sendMode === 'schedule' && scheduleDate && scheduleTime && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Scheduled:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {sendMode === 'delay' && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Delay:</span>
                      <span className="font-medium text-gray-800">{delayMinutes} minutes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {selectedTemplate && (
                <div className="bg-white rounded-2xl shadow-xl border p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    👁️ Message Card Preview
                  </h3>
                  <div className="bg-[#0b141a] rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-3 text-center">
                      WhatsApp {provider === 'meta' ? 'Meta (Native)' : 'QR (Text)'}
                    </p>

                    {/* WhatsApp Card Style */}
                    <div className="bg-[#025c4c] rounded-2xl overflow-hidden max-w-xs mx-auto shadow-2xl">
                      {/* Header Image */}
                      {selectedTemplate.headerMedia?.url && (
                        <div className="relative">
                          <img
                            src={selectedTemplate.headerMedia.url}
                            alt=""
                            className="w-full h-40 object-cover"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-0.5 rounded text-xs text-white">
                            📷 Image
                          </div>
                        </div>
                      )}
                      
                      {/* Body Content */}
                      <div className="bg-[#005c4b] p-4">
                        <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedTemplate.templateContent}
                        </p>
                        
                        {/* QR shows buttons as text */}
                        {provider === 'qr' && selectedTemplate.buttons?.length ? (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            {selectedTemplate.buttons.map((btn, i) => (
                              <p key={i} className="text-white/90 text-sm py-1">
                                📌 {btn.title}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        
                        {/* Timestamp */}
                        <div className="flex justify-end mt-2">
                          <span className="text-xs text-white/60">
                            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                          </span>
                        </div>
                      </div>

                      {/* Meta shows native blue buttons */}
                      {provider === 'meta' && selectedTemplate.buttons?.map((btn, i) => (
                        <div key={i} className="border-t border-[#0a3a3a]">
                          <button className="w-full py-3 text-[#53bdeb] text-sm font-medium text-center hover:bg-[#0a3a3a] transition-colors flex items-center justify-center gap-2">
                            <span>↩️</span>
                            {btn.title}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Provider Badge */}
                    <div className="mt-4 text-center">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                        provider === 'meta' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      }`}>
                        {provider === 'meta' ? '🟢 Meta Cloud API' : '💚 QR Bridge'}
                      </span>
                    </div>
                    
                    {/* Features */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2 rounded-lg ${selectedTemplate.headerMedia?.url ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <span className="text-lg">{selectedTemplate.headerMedia?.url ? '✅' : '➖'}</span>
                        <p className="text-xs text-gray-300">Image</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <span className="text-lg">✅</span>
                        <p className="text-xs text-gray-300">Body</p>
                      </div>
                      <div className={`p-2 rounded-lg ${selectedTemplate.buttons?.length ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <span className="text-lg">{selectedTemplate.buttons?.length ? '✅' : '➖'}</span>
                        <p className="text-xs text-gray-300">Button</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-5 py-3 border-2 rounded-xl font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  <span>←</span> Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={!canSend || sending}
                  className={`flex-1 px-5 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    canSend && !sending
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {sending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      🚀 {sendMode === 'now' ? 'Send Now' : sendMode === 'schedule' ? 'Schedule' : 'Queue'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
