'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, Search, Users, Radio, AlertTriangle, CheckCircle2, Loader2,
  Clock, Pause, Play, Eye, FileEdit, Plus, Trash2, ChevronDown, ChevronUp,
  RefreshCw, BarChart3, ArrowLeft, Zap
} from 'lucide-react';

// ── Rate Limiting Constants (Telegram allows ~30/sec, we use 10/batch with delay) ──
const BATCH_SIZE = 10;
const MSG_DELAY_MIN = 100;   // Telegram is more relaxed than WhatsApp
const MSG_DELAY_MAX = 300;

type BroadcastStatus = 'draft' | 'sending' | 'paused' | 'completed' | 'failed';

type BroadcastRun = {
  id: string;
  message: string;
  templateId?: string;
  templateName?: string;
  recipients: number[];  // Telegram chat IDs
  recipientNames: Record<string, string>;
  imageUrl?: string;
  videoUrl?: string;
  status: BroadcastStatus;
  sent: number;
  failed: number;
  total: number;
  createdAt: number;
  errors: string[];
  log: Array<{ chatId: number; status: 'sent' | 'failed' | 'pending'; time: number; error?: string }>;
  // Unified broadcast flag
  alsoWhatsApp?: boolean;
  whatsAppSent?: number;
  whatsAppFailed?: number;
};

type TelegramContact = {
  _id: string;
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  chatType: string;
  groupTitle: string;
  lastMessageAt: string;
  messageCount: number;
};

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  footerText?: string;
  imageFile?: { url: string };
  videoUrl?: string;
  buttons?: Array<{ title: string }>;
};

const STORAGE_KEY = 'tg_broadcast_runs';

function loadRuns(): BroadcastRun[] {
  try { const v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
}
function saveRuns(runs: BroadcastRun[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 30))); } catch {}
}

export default function TelegramBroadcastPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // State
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<number>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [alsoWhatsApp, setAlsoWhatsApp] = useState(false);

  // Runs
  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Sending
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);

  const contactName = (c: TelegramContact) => {
    if (c.chatType !== 'private' && c.groupTitle) return c.groupTitle;
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || `Chat ${c.chatId}`;
  };

  // ── Load Data ──
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [contactsRes, templatesRes] = await Promise.all([
        crmFetch('/api/admin/crm/telegram/contacts?limit=500'),
        crmFetch('/api/admin/crm/templates?provider=telegram&limit=100'),
      ]);
      if (contactsRes.ok) {
        const cd = await contactsRes.json();
        setContacts(cd.contacts || []);
      }
      if (templatesRes.ok) {
        const td = await templatesRes.json();
        setTemplates(td.templates || []);
      }
    } catch {}
    setLoading(false);
    setRuns(loadRuns());
  }, [token, crmFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Select template ──
  const applyTemplate = (tmplId: string) => {
    const tmpl = templates.find(t => t._id === tmplId);
    if (tmpl) {
      setSelectedTemplate(tmplId);
      setMessageText(tmpl.templateContent || '');
      setImageUrl(tmpl.imageFile?.url || '');
      setVideoUrl(tmpl.videoUrl || '');
    }
  };

  // ── Toggle recipient ──
  const toggleRecipient = (chatId: number) => {
    const next = new Set(selectedRecipients);
    if (next.has(chatId)) next.delete(chatId);
    else next.add(chatId);
    setSelectedRecipients(next);
  };

  const selectAll = () => {
    if (selectedRecipients.size === filteredContacts.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(filteredContacts.map(c => c.chatId)));
    }
  };

  const filteredContacts = contacts.filter(c =>
    contactName(c).toLowerCase().includes(recipientSearch.toLowerCase()) ||
    c.username?.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  // ── Send Broadcast ──
  const startBroadcast = async () => {
    if (selectedRecipients.size === 0 || !messageText.trim()) return;
    setIsSending(true);
    sendingRef.current = true;
    setError(null);

    const chatIds = Array.from(selectedRecipients);
    const recipientNames: Record<string, string> = {};
    chatIds.forEach(id => {
      const c = contacts.find(ct => ct.chatId === id);
      if (c) recipientNames[String(id)] = contactName(c);
    });

    const newRun: BroadcastRun = {
      id: `tg_${Date.now()}`,
      message: messageText,
      templateId: selectedTemplate || undefined,
      templateName: templates.find(t => t._id === selectedTemplate)?.templateName,
      recipients: chatIds,
      recipientNames,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      status: 'sending',
      sent: 0,
      failed: 0,
      total: chatIds.length,
      createdAt: Date.now(),
      errors: [],
      log: chatIds.map(id => ({ chatId: id, status: 'pending' as const, time: 0 })),
      alsoWhatsApp: alsoWhatsApp,
      whatsAppSent: 0,
      whatsAppFailed: 0,
    };

    const updatedRuns = [newRun, ...runs];
    setRuns(updatedRuns);
    saveRuns(updatedRuns);
    setActiveTab('history');
    setExpandedRun(newRun.id);

    try {
      // Send Telegram broadcast
      const res = await crmFetch('/api/admin/crm/telegram/broadcast', {
        method: 'POST',
        body: {
          chatIds,
          text: messageText,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          templateId: selectedTemplate || undefined,
          broadcastRunId: newRun.id,
        },
      });
      const data = await res.json();

      newRun.sent = data.sent || 0;
      newRun.failed = data.failed || 0;
      newRun.status = 'completed';
      if (data.errors) newRun.errors = data.errors;

      // Update log entries
      newRun.log = chatIds.map((id, i) => ({
        chatId: id,
        status: i < (data.sent || 0) ? 'sent' as const : 'failed' as const,
        time: Date.now(),
      }));

      // Also send to WhatsApp QR if unified
      if (alsoWhatsApp) {
        try {
          const qrRes = await crmFetch('/api/admin/crm/whatsapp/qr/broadcast', {
            method: 'POST',
            body: {
              message: messageText,
              imageUrl: imageUrl || undefined,
            },
          });
          const qrData = await qrRes.json();
          newRun.whatsAppSent = qrData.sent || 0;
          newRun.whatsAppFailed = qrData.failed || 0;
        } catch {
          newRun.whatsAppFailed = -1; // Indicate error
        }
      }

      setSuccess(`Broadcast complete: ${newRun.sent} sent, ${newRun.failed} failed`);
    } catch (err: any) {
      newRun.status = 'failed';
      newRun.errors = [err.message];
      setError(err.message);
    }

    const finalRuns = [newRun, ...runs.filter(r => r.id !== newRun.id)];
    setRuns(finalRuns);
    saveRuns(finalRuns);
    setIsSending(false);
    sendingRef.current = false;

    // Reset compose
    setSelectedRecipients(new Set());
    setMessageText('');
    setImageUrl('');
    setVideoUrl('');
    setSelectedTemplate(null);
    setAlsoWhatsApp(false);
    setTimeout(() => { setSuccess(null); setError(null); }, 5000);
  };

  const deleteRun = (id: string) => {
    const next = runs.filter(r => r.id !== id);
    setRuns(next);
    saveRuns(next);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/telegram" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Telegram Broadcast</h1>
              <p className="text-xs text-gray-400">{contacts.length} contacts available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Alerts */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 flex items-center gap-2 text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          {(['compose', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── COMPOSE TAB ── */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                {/* Template Selector */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Use Template</label>
                    <select
                      value={selectedTemplate || ''}
                      onChange={e => e.target.value ? applyTemplate(e.target.value) : setSelectedTemplate(null)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Write custom message</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.templateName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Message *</label>
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    rows={4}
                    placeholder="Type your broadcast message..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Media URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Video URL</label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Unified Broadcast Toggle */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoWhatsApp}
                      onChange={e => setAlsoWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm text-white font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Also send via QR WhatsApp
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Send same message to WhatsApp QR bridge contacts simultaneously
                      </p>
                    </div>
                  </label>
                </div>

                {/* Recipient Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400">
                      Recipients ({selectedRecipients.size} / {contacts.length})
                    </label>
                    <button
                      onClick={selectAll}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {selectedRecipients.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={e => setRecipientSearch(e.target.value)}
                      placeholder="Filter contacts..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                    {filteredContacts.length === 0 ? (
                      <p className="p-3 text-xs text-gray-500 text-center">No contacts</p>
                    ) : (
                      filteredContacts.map(c => (
                        <label
                          key={c._id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.has(c.chatId)}
                            onChange={() => toggleRecipient(c.chatId)}
                            className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <span className="text-sm text-white truncate block">{contactName(c)}</span>
                            {c.username && <span className="text-[10px] text-gray-500">@{c.username}</span>}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={startBroadcast}
                  disabled={isSending || selectedRecipients.size === 0 || !messageText.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      Send Broadcast to {selectedRecipients.size} contact{selectedRecipients.size !== 1 ? 's' : ''}
                      {alsoWhatsApp && ' + WhatsApp QR'}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No broadcast history yet</p>
              </div>
            ) : (
              runs.map(run => (
                <div key={run.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/50"
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'completed' ? 'bg-green-400' :
                        run.status === 'sending' ? 'bg-yellow-400 animate-pulse' :
                        run.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {run.templateName || run.message.slice(0, 50) + '...'}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(run.createdAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                          {' · '}
                          {run.sent} sent, {run.failed} failed / {run.total}
                          {run.alsoWhatsApp && (
                            <span className="text-blue-400 ml-2">
                              + WA: {run.whatsAppSent || 0} sent
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); deleteRun(run.id); }}
                        className="p-1 text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedRun === run.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {expandedRun === run.id && (
                    <div className="border-t border-gray-800 p-3 space-y-2">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{run.message}</p>
                      </div>
                      {run.errors.length > 0 && (
                        <div className="text-xs text-red-400 space-y-1">
                          {run.errors.slice(0, 5).map((e, i) => (
                            <p key={i}>• {e}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {run.log.map((entry, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                              entry.status === 'sent' ? 'bg-green-900/30 text-green-400' :
                              entry.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                              'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {run.recipientNames[String(entry.chatId)] || entry.chatId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
