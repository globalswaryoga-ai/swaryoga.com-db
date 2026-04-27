'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Clock, Loader2, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  isGroup?: boolean;
  unreadCount?: number;
}

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
}

interface BroadcastRun {
  id: string;
  name: string;
  recipients: string[];
  sent: number;
  status: 'queued' | 'sending' | 'completed' | 'paused';
  createdAt: string;
}

interface BroadcastTabProps {
  token: string | null;
  isConnected: boolean;
}

export function BroadcastTab({ token, isConnected }: BroadcastTabProps) {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [chats, setChats] = useState<Chat[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [runs, setRuns] = useState<BroadcastRun[]>([]);

  // Fetch chats and templates
  const fetchData = useCallback(async () => {
    if (!token || !isConnected) return;
    setLoading(true);
    try {
      const [chatsRes, templatesRes] = await Promise.all([
        fetch('/api/admin/crm/whatsapp/qr-bridge?path=/chats', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/templates?provider=qr&limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData?.chats ?? chatsData?.result ?? []);
      }
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData?.templates ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, isConnected]);

  useEffect(() => {
    if (isConnected && token) fetchData();
    else setLoading(false);
  }, [token, isConnected, fetchData]);

  // Load runs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr_broadcast_runs');
      if (saved) setRuns(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load broadcast history');
    }
  }, []);

  const handleSendBroadcast = async () => {
    if (selectedChats.size === 0) {
      setError('Select at least one recipient');
      return;
    }
    if (!selectedTemplate && !customMessage.trim()) {
      setError('Select a template or write a message');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const runId = `run_${Date.now()}`;
      const newRun: BroadcastRun = {
        id: runId,
        name: `Broadcast - ${new Date().toLocaleString()}`,
        recipients: Array.from(selectedChats),
        sent: 0,
        status: scheduleMode === 'now' ? 'sending' : 'queued',
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      const updatedRuns = [newRun, ...runs].slice(0, 50);
      localStorage.setItem('qr_broadcast_runs', JSON.stringify(updatedRuns));
      setRuns(updatedRuns);

      setSuccess(`Broadcast ${scheduleMode === 'now' ? 'started' : 'scheduled'}!`);
      setTimeout(() => {
        setSuccess(null);
        setSelectedChats(new Set());
        setSelectedTemplate('');
        setCustomMessage('');
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-700">WhatsApp Not Connected</h2>
        <p className="text-sm text-gray-500">Connect your WhatsApp in the Connection tab first</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b bg-gray-50">
        {(['compose', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === t
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            {t === 'compose' ? 'Compose' : 'History'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients ({selectedChats.size} selected)</label>
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {chats.length === 0 ? (
                    <p className="text-sm text-gray-500">No chats available</p>
                  ) : (
                    chats.map(chat => (
                      <label key={chat.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChats.has(chat.id)}
                          onChange={(e) => {
                            const updated = new Set(selectedChats);
                            if (e.target.checked) updated.add(chat.id);
                            else updated.delete(chat.id);
                            setSelectedChats(updated);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{chat.name}</span>
                        {chat.isGroup && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Group</span>}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <div className="space-y-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    const t = templates.find(x => x._id === e.target.value);
                    if (t) setCustomMessage(t.templateContent);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Or select a template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.templateName}</option>
                  ))}
                </select>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-24"
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send</label>
              <div className="flex gap-2">
                {(['now', 'schedule'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={scheduleMode === m}
                      onChange={() => setScheduleMode(m)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{m === 'now' ? 'Send Now' : 'Schedule'}</span>
                  </label>
                ))}
              </div>
              {scheduleMode === 'schedule' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSendBroadcast}
              disabled={sending || selectedChats.size === 0}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No broadcasts yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl mx-auto">
              {runs.map(run => (
                <div key={run.id} className="p-3 border rounded-lg bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{run.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{run.recipients.length} recipients • {run.sent} sent</p>
                      <div className="w-32 h-2 bg-gray-100 rounded-full mt-2">
                        <div
                          className="h-full bg-green-600 rounded-full transition-all"
                          style={{ width: `${run.recipients.length > 0 ? (run.sent / run.recipients.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      run.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
