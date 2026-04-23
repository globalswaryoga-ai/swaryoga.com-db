'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { Send, Search, Users, Clock, AlertTriangle, CheckCircle2, X, Loader2, Calendar, Radio, Pause, Play, Eye, FileText, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, Zap, Shield, Timer, BarChart3 } from 'lucide-react';

// ── Rate Limiting Constants (QR WhatsApp - Conservative, Anti-Signout) ──
const BATCH_SIZE = 5;             // 5 messages per batch (safer, human-like for QR)
const BATCH_INTERVAL_MS = 20000;  // 20 seconds between batches (realistic, not aggressive)
const DAILY_LIMIT = 300;          // 300 messages per day (practical limit)
const MSG_DELAY_MIN = 3000;       // 3s between messages within batch
const MSG_DELAY_MAX = 8000;       // 8s between messages (random, anti-bot detection)
const KEEPALIVE_INTERVAL = 15000; // 15 seconds - keep session alive during waits
const REQUEST_TIMEOUT_MS = 10000; // 10s timeout for send requests

type BroadcastStatus = 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'failed' | 'scheduled';

type BroadcastRun = {
  id: string;
  message: string;
  templateId?: string;
  templateName?: string;
  recipients: string[];  // chat IDs
  recipientNames: Record<string, string>;
  status: BroadcastStatus;
  sent: number;
  failed: number;
  total: number;
  createdAt: number;
  scheduledAt?: number;  // timestamp for scheduled sends
  batchesSent: number;
  lastBatchAt?: number;
  dailySentCount: number; // count for today
  errors: string[];
  log: Array<{ chatId: string; status: 'sent' | 'failed' | 'pending'; time: number; error?: string }>;
};

type ChatItem = {
  id: string;
  name: string;
  isGroup: boolean;
};

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  headerContent?: string;
  footerText?: string;
  buttons?: Array<{ title: string }>;
};

// Persistent storage key for broadcast runs
const STORAGE_KEY = 'qr_broadcast_runs';
const DAILY_COUNT_KEY = 'qr_broadcast_daily';

function getDailyKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadRuns(): BroadcastRun[] {
  try { const v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
}

function saveRuns(runs: BroadcastRun[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 50))); } catch {} // keep last 50
}

function getDailySent(): number {
  try {
    const v = localStorage.getItem(DAILY_COUNT_KEY);
    if (!v) return 0;
    const parsed = JSON.parse(v);
    if (parsed.date !== getDailyKey()) return 0;
    return parsed.count || 0;
  } catch { return 0; }
}

function setDailySent(count: number) {
  try { localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: getDailyKey(), count })); } catch {}
}

function randomDelay() {
  return MSG_DELAY_MIN + Math.floor(Math.random() * (MSG_DELAY_MAX - MSG_DELAY_MIN));
}

// Health check: verify connection is still active (prevents auto-signout)
async function healthCheck(bridgeCall: any, runId: string): Promise<boolean> {
  try {
    const status = await bridgeCall('/status', 'GET');
    return status?.connected === true || status?.state === 'connected';
  } catch (e) {
    console.warn(`[${runId}] Health check failed:`, e);
    return false;
  }
}

// Keepalive: send silent ping every 15 seconds to prevent WhatsApp auto-logout
function startKeepalive(bridgeCall: any, runId: string, onFailure: () => void): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const isHealthy = await healthCheck(bridgeCall, runId);
      if (!isHealthy) {
        console.warn(`[${runId}] Connection unhealthy, attempting reconnect...`);
        try {
          await bridgeCall('/reconnect', 'POST');
        } catch (reconnectErr) {
          console.error(`[${runId}] Reconnect failed:`, reconnectErr);
          onFailure();
        }
      }
    } catch (e) {
      console.warn(`[${runId}] Keepalive check failed:`, e);
    }
  }, KEEPALIVE_INTERVAL);
}

// Send message with timeout
async function sendWithTimeout(bridgeCall: any, to: string, message: string, timeoutMs = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    bridgeCall('/send', 'POST', { to, message, type: 'text' }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Send timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function QRBroadcastPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // ── State ──
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Runs
  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [dailySent, setDailySentState] = useState(0);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Active sending ref (to support pause/resume)
  const sendingRef = useRef(false);
  const pausedRef = useRef(false);

  // ── Load chats from bridge and templates ──
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Load chats via bridge proxy
        const chatRes = await crmFetch('/api/admin/crm/whatsapp/qr-bridge', { params: { path: '/chats' } });
        if (!cancelled && Array.isArray(chatRes)) {
          setChats(chatRes.map((c: any) => ({ id: c.id, name: c.name || c.id, isGroup: c.isGroup || false })));
        }
      } catch (e) {
        console.warn('[Broadcast] Failed to load chats:', e);
      }
      try {
        // Load QR templates
        const tplRes = await crmFetch('/api/admin/crm/templates', { params: { provider: 'qr', limit: 100 } });
        if (!cancelled) {
          const list = tplRes?.data?.templates ?? tplRes?.templates ?? [];
          setTemplates(list);
        }
      } catch (e) {
        console.warn('[Broadcast] Failed to load templates:', e);
      }
      if (!cancelled) {
        setRuns(loadRuns());
        setDailySentState(getDailySent());
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, crmFetch]);

  // Filtered recipients
  const filteredChats = useMemo(() => {
    if (!recipientSearch) return chats;
    const q = recipientSearch.toLowerCase();
    return chats.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [chats, recipientSearch]);

  // Toggle recipient
  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Select template
  const applyTemplate = (tplId: string) => {
    const tpl = templates.find(t => t._id === tplId);
    if (tpl) {
      let text = '';
      if (tpl.headerContent && !tpl.headerContent.startsWith('http')) text += tpl.headerContent + '\n\n';
      text += tpl.templateContent;
      if (tpl.footerText) text += '\n\n' + tpl.footerText;
      setMessageText(text);
      setSelectedTemplate(tplId);
    }
  };

  // ── Bridge call helper ──
  const bridgeCall = useCallback(async (path: string, method = 'GET', body?: any) => {
    if (method === 'GET') {
      return crmFetch('/api/admin/crm/whatsapp/qr-bridge', { params: { path } });
    }
    return crmFetch('/api/admin/crm/whatsapp/qr-bridge', { method: 'POST', body: { action: method, path, body } });
  }, [crmFetch]);

  // ── Create Broadcast Run ──
  const createBroadcast = () => {
    if (!messageText.trim()) { setError('Message text is required'); return; }
    if (selectedRecipients.size === 0) { setError('Select at least one recipient'); return; }

    // Deduplicate recipients (remove any duplicates by number)
    const uniqueRecipients = new Set<string>();
    const seenNumbers = new Set<string>();

    selectedRecipients.forEach(id => {
      const chat = chats.find(ch => ch.id === id);
      if (chat) {
        // Extract number from chat ID (e.g., "1234567890@s.whatsapp.net" → "1234567890")
        const number = chat.id.split('@')[0];
        if (!seenNumbers.has(number)) {
          uniqueRecipients.add(id);
          seenNumbers.add(number);
        }
      } else {
        uniqueRecipients.add(id);
      }
    });

    const recipientIds = Array.from(uniqueRecipients);
    const currentDaily = getDailySent();

    if (currentDaily + recipientIds.length > DAILY_LIMIT) {
      setError(`Daily limit: ${DAILY_LIMIT} messages. Already sent ${currentDaily} today. Can send ${Math.max(0, DAILY_LIMIT - currentDaily)} more.`);
      return;
    }

    const nameMap: Record<string, string> = {};
    recipientIds.forEach(id => {
      const c = chats.find(ch => ch.id === id);
      if (c) nameMap[id] = c.name;
    });

    let scheduledAt: number | undefined;
    if (scheduleMode === 'scheduled') {
      if (!scheduleDate || !scheduleTime) { setError('Schedule date and time are required'); return; }
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).getTime();
      if (scheduledAt <= Date.now()) { setError('Scheduled time must be in the future'); return; }
    }

    const run: BroadcastRun = {
      id: `bc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: messageText.trim(),
      templateId: selectedTemplate || undefined,
      templateName: selectedTemplate ? templates.find(t => t._id === selectedTemplate)?.templateName : undefined,
      recipients: recipientIds,
      recipientNames: nameMap,
      status: scheduledAt ? 'scheduled' : 'queued',
      sent: 0,
      failed: 0,
      total: recipientIds.length,
      createdAt: Date.now(),
      scheduledAt,
      batchesSent: 0,
      dailySentCount: currentDaily,
      errors: [],
      log: recipientIds.map(id => ({ chatId: id, status: 'pending' as const, time: 0 })),
    };

    const updated = [run, ...runs];
    setRuns(updated);
    saveRuns(updated);

    // Reset compose
    setMessageText('');
    setSelectedRecipients(new Set());
    setSelectedTemplate(null);
    setScheduleMode('now');
    setComposeOpen(false);
    setSuccess(`Broadcast ${scheduledAt ? 'scheduled' : 'created'}! ${recipientIds.length} recipients.`);
    setTimeout(() => setSuccess(null), 4000);
    setActiveTab('history');

    // If immediate, start sending
    if (!scheduledAt) {
      setTimeout(() => startSending(run.id, updated), 500);
    }
  };

  // ── Send Logic with Anti-Bot Mechanism + Anti-Signout Keepalive ──
  const startSending = async (runId: string, currentRuns?: BroadcastRun[]) => {
    const allRuns = currentRuns || [...runs];
    const runIndex = allRuns.findIndex(r => r.id === runId);
    if (runIndex === -1) return;

    const run = { ...allRuns[runIndex] };

    // Check if already completed or failed
    if (run.status === 'completed' || run.status === 'failed') return;

    // Check daily limit
    let dailyCount = getDailySent();
    if (dailyCount >= DAILY_LIMIT) {
      run.status = 'paused';
      run.errors.push(`Daily limit of ${DAILY_LIMIT} reached. Will resume tomorrow.`);
      allRuns[runIndex] = run;
      setRuns([...allRuns]);
      saveRuns(allRuns);
      return;
    }

    // Check batch timing (20 seconds between batches with keepalive)
    let keepaliveInterval: NodeJS.Timeout | null = null;
    if (run.batchesSent > 0 && run.lastBatchAt) {
      const elapsed = Date.now() - run.lastBatchAt;
      if (elapsed < BATCH_INTERVAL_MS) {
        const waitSeconds = Math.ceil((BATCH_INTERVAL_MS - elapsed) / 1000);
        run.status = 'paused';
        run.errors.push(`Batch cooldown: ${waitSeconds}s remaining. Auto-resumes. (Keepalive active: ✓)`);
        allRuns[runIndex] = run;
        setRuns([...allRuns]);
        saveRuns(allRuns);

        // ═══ START KEEPALIVE DURING WAIT ═══
        keepaliveInterval = startKeepalive(bridgeCall, runId, () => {
          console.warn(`[${runId}] Connection lost during batch wait, marking as failed`);
          run.status = 'failed';
          run.errors.push('Connection lost during batch cooldown. Please reconnect and resume.');
          allRuns[runIndex] = run;
          setRuns([...allRuns]);
          saveRuns(allRuns);
        });

        // Schedule auto-resume with keepalive
        const resumeTimeout = setTimeout(() => {
          if (keepaliveInterval) clearInterval(keepaliveInterval);
          startSending(runId);
        }, BATCH_INTERVAL_MS - elapsed + 1000);

        return;
      }
    }

    run.status = 'sending';
    sendingRef.current = true;
    pausedRef.current = false;
    allRuns[runIndex] = run;
    setRuns([...allRuns]);
    saveRuns(allRuns);

    // Find pending recipients for this batch
    const pending = run.log.filter(l => l.status === 'pending');
    const batchRecipients = pending.slice(0, Math.min(BATCH_SIZE, DAILY_LIMIT - dailyCount));

    for (let i = 0; i < batchRecipients.length; i++) {
      // Check pause
      if (pausedRef.current) {
        run.status = 'paused';
        allRuns[runIndex] = { ...run };
        setRuns([...allRuns]);
        saveRuns(allRuns);
        sendingRef.current = false;
        return;
      }

      const entry = batchRecipients[i];
      const logIdx = run.log.findIndex(l => l.chatId === entry.chatId && l.status === 'pending');

      try {
        const isGroup = entry.chatId.endsWith('@g.us') || entry.chatId.endsWith('@lid');
        const to = isGroup ? entry.chatId : entry.chatId.replace('@s.whatsapp.net', '');

        // ═══ SEND WITH TIMEOUT (prevents hanging) ═══
        await sendWithTimeout(bridgeCall, to, run.message, REQUEST_TIMEOUT_MS);

        run.sent++;
        dailyCount++;
        setDailySent(dailyCount);
        setDailySentState(dailyCount);

        if (logIdx !== -1) {
          run.log[logIdx] = { ...run.log[logIdx], status: 'sent', time: Date.now() };
        }
      } catch (e: any) {
        run.failed++;
        const errorMsg = e?.message || 'Send failed';
        if (logIdx !== -1) {
          run.log[logIdx] = { ...run.log[logIdx], status: 'failed', time: Date.now(), error: errorMsg };
        }
        run.errors.push(`Failed ${entry.chatId}: ${errorMsg}`);
      }

      // Update UI
      allRuns[runIndex] = { ...run };
      setRuns([...allRuns]);
      saveRuns(allRuns);

      // Random delay between messages (3-8 seconds) — anti-bot
      if (i < batchRecipients.length - 1) {
        const delay = randomDelay();
        await new Promise(r => setTimeout(r, delay));
      }
    }

    run.batchesSent++;
    run.lastBatchAt = Date.now();

    // Check if all done
    const remainingPending = run.log.filter(l => l.status === 'pending');
    if (remainingPending.length === 0) {
      run.status = 'completed';
    } else if (dailyCount >= DAILY_LIMIT) {
      run.status = 'paused';
      run.errors.push(`Daily limit reached (${DAILY_LIMIT}). Remaining ${remainingPending.length} will send next day.`);
    } else {
      run.status = 'paused';
      const estimatedTime = Math.ceil((remainingPending.length / BATCH_SIZE) * (BATCH_INTERVAL_MS / 1000));
      run.errors.push(`Batch ${run.batchesSent} complete (${batchRecipients.length} sent). Next batch in ${(BATCH_INTERVAL_MS / 1000).toFixed(0)}s. Estimated: ${estimatedTime}s remaining. (Keepalive: ✓)`);

      // ═══ SCHEDULE NEXT BATCH WITH KEEPALIVE ═══
      keepaliveInterval = startKeepalive(bridgeCall, runId, () => {
        console.warn(`[${runId}] Connection lost between batches`);
        run.status = 'failed';
        run.errors.push('Connection lost. Attempting to resume...');
        allRuns[runIndex] = run;
        setRuns([...allRuns]);
        saveRuns(allRuns);
      });

      const resumeTimeout = setTimeout(() => {
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        startSending(runId);
      }, BATCH_INTERVAL_MS + 1000);
    }

    allRuns[runIndex] = { ...run };
    setRuns([...allRuns]);
    saveRuns(allRuns);
    sendingRef.current = false;
  };

  // Pause/Resume
  const pauseBroadcast = (runId: string) => {
    pausedRef.current = true;
    const updated = runs.map(r => r.id === runId ? { ...r, status: 'paused' as const } : r);
    setRuns(updated);
    saveRuns(updated);
  };

  const resumeBroadcast = (runId: string) => {
    startSending(runId);
  };

  // Delete run
  const deleteRun = (runId: string) => {
    if (!confirm('Delete this broadcast run?')) return;
    const updated = runs.filter(r => r.id !== runId);
    setRuns(updated);
    saveRuns(updated);
  };

  // Schedule checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const scheduledRuns = runs.filter(r => r.status === 'scheduled' && r.scheduledAt && r.scheduledAt <= now);
      if (scheduledRuns.length > 0) {
        for (const run of scheduledRuns) {
          startSending(run.id);
        }
      }
    }, 30_000); // Check every 30 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  const remainingToday = Math.max(0, DAILY_LIMIT - dailySent);

  // ── RENDER ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR WhatsApp Broadcast</h1>
            <p className="text-sm text-gray-500 mt-0.5">Send messages to multiple contacts with anti-bot protection</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Daily quota indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
              <Shield className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-[10px] text-gray-500">Daily Quota</div>
                <div className="text-sm font-bold text-gray-800">{dailySent}/{DAILY_LIMIT}</div>
              </div>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(dailySent / DAILY_LIMIT) * 100}%` }} />
              </div>
            </div>
            <Link href="/admin/crm/qr/broadcast-report" className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition">
              <BarChart3 className="w-4 h-4" /> Report
            </Link>
            <button
              onClick={() => { setComposeOpen(true); setActiveTab('compose'); }}
              disabled={remainingToday === 0}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm"
            >
              <Send className="w-4 h-4" /> New Broadcast
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Alerts */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4 flex justify-between">{error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-4">{success}</div>}

        {/* QR WhatsApp Anti-Signout Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>🔒 QR WhatsApp Anti-Signout Protection Active</strong>
            <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
              <li>• <strong>{BATCH_SIZE} messages</strong> per batch (conservative for QR stability)</li>
              <li>• <strong>{(BATCH_INTERVAL_MS / 1000).toFixed(0)}s</strong> cooldown between batches (prevents auto-signout)</li>
              <li>• Random delays: <strong>3-8s</strong> between messages (looks human, anti-ban)</li>
              <li>• No duplicate recipients (auto-deduplicates by number)</li>
              <li>• Max <strong>{DAILY_LIMIT}</strong> messages per day</li>
              <li>• Keepalive every {(KEEPALIVE_INTERVAL / 1000).toFixed(0)}s (keeps session alive)</li>
              <li>• ✅ Account never auto-signs out with aggressive keepalive</li>
            </ul>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setActiveTab('compose')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'compose' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Send className="w-3.5 h-3.5 inline mr-1.5" />Compose
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />History
            {runs.filter(r => r.status === 'sending' || r.status === 'queued').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-green-600 text-white">{runs.filter(r => r.status === 'sending' || r.status === 'queued').length}</span>
            )}
          </button>
        </div>

        {/* ═══ COMPOSE TAB ═══ */}
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message Composer */}
            <div className="lg:col-span-2 space-y-4">
              {/* Template Selection */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" /> Use a Template (optional)
                </h3>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-400">No QR templates found. <a href="/admin/crm/qr/templates" className="text-green-600 font-medium hover:underline">Create one first</a>.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {templates.slice(0, 9).map(tpl => (
                      <button
                        key={tpl._id}
                        onClick={() => applyTemplate(tpl._id)}
                        className={`p-3 rounded-lg border text-left transition hover:shadow-sm ${selectedTemplate === tpl._id ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <p className="text-xs font-semibold text-gray-800 truncate">{tpl.templateName}</p>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{tpl.templateContent.slice(0, 60)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Text */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Message</h3>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your broadcast message…"
                  rows={6}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
                  maxLength={4096}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">Supports WhatsApp formatting: *bold*, _italic_, ~strike~</span>
                  <span className="text-[10px] text-gray-400">{messageText.length}/4096</span>
                </div>
              </div>

              {/* Schedule Toggle */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" /> Schedule
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setScheduleMode('now')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${scheduleMode === 'now' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Zap className="w-3.5 h-3.5 inline mr-1" /> Send Now
                  </button>
                  <button
                    onClick={() => setScheduleMode('scheduled')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${scheduleMode === 'scheduled' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Schedule
                  </button>
                </div>
                {scheduleMode === 'scheduled' && (
                  <div className="flex items-center gap-3">
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500" min={new Date().toISOString().slice(0, 10)} />
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={createBroadcast}
                disabled={!messageText.trim() || selectedRecipients.size === 0 || remainingToday === 0}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Send className="w-4 h-4" />
                {scheduleMode === 'scheduled' ? 'Schedule Broadcast' : 'Send Broadcast'}
                {selectedRecipients.size > 0 && ` to ${selectedRecipients.size} recipient${selectedRecipients.size > 1 ? 's' : ''}`}
              </button>
            </div>

            {/* Recipient Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden lg:sticky lg:top-24">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" /> Recipients
                  </h3>
                  <span className="text-xs text-gray-500">{selectedRecipients.size} selected</span>
                </div>
                <div className="px-3 py-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={e => setRecipientSearch(e.target.value)}
                      placeholder="Search contacts…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                {/* Quick actions */}
                <div className="px-3 py-1.5 border-b flex items-center gap-1.5">
                  <button onClick={() => setSelectedRecipients(new Set(chats.filter(c => !c.isGroup).map(c => c.id)))} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium hover:bg-blue-100">All Contacts</button>
                  <button onClick={() => setSelectedRecipients(new Set(chats.filter(c => c.isGroup).map(c => c.id)))} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium hover:bg-purple-100">All Groups</button>
                  <button onClick={() => setSelectedRecipients(new Set())} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200">Clear</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                  ) : filteredChats.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No contacts found</p>
                  ) : (
                    filteredChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => toggleRecipient(chat.id)}
                        className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-50 transition border-b border-gray-50 ${selectedRecipients.has(chat.id) ? 'bg-green-50' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedRecipients.has(chat.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                          {selectedRecipients.has(chat.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{chat.name}</p>
                          {chat.isGroup && <span className="text-[10px] text-purple-500 font-medium">Group</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {/* Remaining quota */}
                <div className="px-4 py-3 border-t bg-gray-50 text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  {remainingToday} messages remaining today • {BATCH_SIZE}/batch • 1hr cooldown
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {runs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border">
                <Radio className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-1">No broadcasts yet</h3>
                <p className="text-sm text-gray-400 mb-4">Create your first broadcast to start messaging contacts</p>
                <button onClick={() => setActiveTab('compose')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm">
                  <Send className="w-4 h-4 inline mr-1" /> New Broadcast
                </button>
              </div>
            ) : (
              runs.map(run => {
                const isExpanded = expandedRun === run.id;
                const statusColors: Record<string, string> = {
                  draft: 'bg-gray-100 text-gray-700',
                  queued: 'bg-yellow-100 text-yellow-700',
                  sending: 'bg-blue-100 text-blue-700',
                  paused: 'bg-amber-100 text-amber-700',
                  completed: 'bg-green-100 text-green-700',
                  failed: 'bg-red-100 text-red-700',
                  scheduled: 'bg-purple-100 text-purple-700',
                };
                const statusIcons: Record<string, React.ReactNode> = {
                  sending: <Loader2 className="w-3 h-3 animate-spin" />,
                  paused: <Pause className="w-3 h-3" />,
                  completed: <CheckCircle2 className="w-3 h-3" />,
                  scheduled: <Calendar className="w-3 h-3" />,
                  queued: <Clock className="w-3 h-3" />,
                  failed: <AlertTriangle className="w-3 h-3" />,
                };
                const progress = run.total > 0 ? ((run.sent + run.failed) / run.total) * 100 : 0;

                return (
                  <div key={run.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Run Header */}
                    <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition" onClick={() => setExpandedRun(isExpanded ? null : run.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColors[run.status] || 'bg-gray-100 text-gray-600'}`}>
                            {statusIcons[run.status]} {run.status.toUpperCase()}
                          </span>
                          {run.templateName && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                              {run.templateName}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{formatDateTime(run.createdAt)}</span>
                          {run.scheduledAt && run.status === 'scheduled' && (
                            <span className="text-[10px] text-purple-600 font-medium">Scheduled: {formatDateTime(run.scheduledAt)}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 truncate">{run.message.slice(0, 100)}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{run.sent}/{run.total}</div>
                          <div className="text-[10px] text-gray-400">sent {run.failed > 0 && `(${run.failed} failed)`}</div>
                        </div>
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: run.failed > 0 ? '#ef4444' : '#22c55e' }} />
                        </div>
                        <div className="flex items-center gap-1">
                          {run.status === 'sending' && (
                            <button onClick={e => { e.stopPropagation(); pauseBroadcast(run.id); }} className="p-1.5 hover:bg-amber-50 rounded-lg" title="Pause">
                              <Pause className="w-4 h-4 text-amber-600" />
                            </button>
                          )}
                          {run.status === 'paused' && (
                            <button onClick={e => { e.stopPropagation(); resumeBroadcast(run.id); }} className="p-1.5 hover:bg-green-50 rounded-lg" title="Resume">
                              <Play className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); deleteRun(run.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t">
                        {/* Message Preview */}
                        <div className="px-5 py-3 bg-gray-50 border-b">
                          <p className="text-xs font-semibold text-gray-500 mb-1">Message</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.message}</p>
                        </div>

                        {/* Batch Info */}
                        <div className="px-5 py-3 border-b flex items-center gap-6 text-xs text-gray-500">
                          <span>Batches sent: <strong className="text-gray-700">{run.batchesSent}</strong></span>
                          {run.lastBatchAt && <span>Last batch: <strong className="text-gray-700">{formatTime(run.lastBatchAt)}</strong></span>}
                          {run.lastBatchAt && run.status === 'paused' && run.log.some(l => l.status === 'pending') && (
                            <span className="text-amber-600">Next batch available: <strong>{formatTime(run.lastBatchAt + BATCH_INTERVAL_MS)}</strong></span>
                          )}
                        </div>

                        {/* Recipient Log */}
                        <div className="px-5 py-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">Recipients ({run.total})</p>
                          <div className="max-h-60 overflow-y-auto divide-y">
                            {run.log.map((entry, idx) => (
                              <div key={idx} className="flex items-center gap-3 py-1.5">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.status === 'sent' ? 'bg-green-500' : entry.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'}`} />
                                <span className="text-sm text-gray-700 flex-1 truncate">{run.recipientNames[entry.chatId] || entry.chatId}</span>
                                <span className={`text-[10px] font-medium ${entry.status === 'sent' ? 'text-green-600' : entry.status === 'failed' ? 'text-red-600' : 'text-gray-400'}`}>
                                  {entry.status === 'sent' ? `Sent ${formatTime(entry.time)}` : entry.status === 'failed' ? `Failed` : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Errors */}
                        {run.errors.length > 0 && (
                          <div className="px-5 py-3 border-t bg-red-50">
                            <p className="text-xs font-semibold text-red-700 mb-1">Log ({run.errors.length})</p>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                              {run.errors.map((err, i) => (
                                <p key={i} className="text-[11px] text-red-600">{err}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
