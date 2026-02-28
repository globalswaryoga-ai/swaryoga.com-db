'use client';

import React, { useEffect, useState } from 'react';
import { X, Phone, PhoneCall, PlayCircle, Clock, Globe, Mic, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface CallLog {
  _id: string;
  purpose: string;
  status: string;
  language: string;
  duration: number;
  summary: string;
  sentiment: string;
  callEndedReason: string;
  collectedData: Record<string, any>;
  crmUpdates: Array<{ field: string; oldValue: any; newValue: any }>;
  createdAt: string;
}

interface AICallModalProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  token: string;
  onClose: () => void;
  onCallMade?: () => void;
}

const PURPOSE_OPTIONS = [
  { value: 'welcome', label: '🙏 Welcome Call', desc: 'Introduce Swar Yoga to the lead' },
  { value: 'follow_up', label: '📞 Follow-up', desc: 'Check in, ask if they have questions' },
  { value: 'workshop_reminder', label: '📅 Workshop Reminder', desc: 'Remind about upcoming workshop' },
  { value: 'collect_info', label: '📋 Collect Info', desc: 'Gather email, country, preferences' },
  { value: 'payment_reminder', label: '💳 Payment Reminder', desc: 'Polite payment follow-up' },
  { value: 'custom', label: '✏️ Custom', desc: 'Write your own call instructions' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  queued: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="h-3 w-3" /> },
  ringing: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Phone className="h-3 w-3 animate-pulse" /> },
  in_progress: { bg: 'bg-green-100', text: 'text-green-700', icon: <Mic className="h-3 w-3 animate-pulse" /> },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { bg: 'bg-red-100', text: 'text-red-600', icon: <XCircle className="h-3 w-3" /> },
  no_answer: { bg: 'bg-orange-100', text: 'text-orange-600', icon: <AlertCircle className="h-3 w-3" /> },
  busy: { bg: 'bg-orange-100', text: 'text-orange-600', icon: <AlertCircle className="h-3 w-3" /> },
  canceled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <XCircle className="h-3 w-3" /> },
};

export default function AICallModal({ leadId, leadName, leadPhone, token, onClose, onCallMade }: AICallModalProps) {
  const [purpose, setPurpose] = useState('follow_up');
  const [language, setLanguage] = useState('hi');
  const [customPrompt, setCustomPrompt] = useState('');
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState('');
  const [callResult, setCallResult] = useState<{ callId: string; status: string; message: string } | null>(null);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  // Fetch call history
  useEffect(() => {
    (async () => {
      try {
        setHistoryLoading(true);
        const res = await fetch(`/api/admin/crm/calls?leadId=${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data) {
          setCallHistory(json.data.calls || []);
          setConfigured(json.data.configured ?? true);
          setMissingKeys(json.data.missing || []);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [leadId, token]);

  const handleCall = async () => {
    try {
      setCalling(true);
      setError('');
      setCallResult(null);

      const res = await fetch('/api/admin/crm/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          purpose,
          language,
          customPrompt: purpose === 'custom' ? customPrompt : undefined,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setCallResult(json.data);
        onCallMade?.();
        // Add to history
        setCallHistory(prev => [{
          _id: json.data.callId,
          purpose,
          status: json.data.status || 'ringing',
          language: language === 'hi' ? 'hi-IN' : 'en-IN',
          duration: 0,
          summary: '',
          sentiment: '',
          callEndedReason: '',
          collectedData: {},
          crmUpdates: [],
          createdAt: new Date().toISOString(),
        }, ...prev]);
      } else {
        setError(json.error || 'Failed to start call');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setCalling(false);
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange-600 uppercase flex items-center gap-1">
              <PhoneCall className="h-3.5 w-3.5" /> AI Voice Call
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">{leadName || 'Lead'}</h2>
            <p className="text-xs text-gray-400">{leadPhone || 'No phone'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Not configured warning */}
          {!configured && (
            <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <p className="font-semibold mb-1">⚠️ Retell AI Not Configured</p>
              <p>Missing environment variables: <span className="font-mono">{missingKeys.join(', ')}</span></p>
              <p className="mt-1 text-amber-600">Add these to <span className="font-mono">.env.local</span> to enable AI calling.</p>
            </div>
          )}

          {/* Purpose selection */}
          <div className="px-6 pt-4 pb-2">
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Call Purpose</label>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPurpose(opt.value)}
                  className={`text-left px-3 py-2 rounded-xl text-xs border transition ${
                    purpose === opt.value
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-semibold block">{opt.label}</span>
                  <span className="text-[10px] text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt (shown only for custom purpose) */}
          {purpose === 'custom' && (
            <div className="px-6 pb-2">
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Write instructions for the AI agent... e.g., 'Ask about their interest in morning yoga sessions and if weekdays or weekends work better.'"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
              />
            </div>
          )}

          {/* Language selection */}
          <div className="px-6 pb-3 flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> Language
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  language === 'hi' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                हिंदी Hindi
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  language === 'en' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-3 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Call result */}
          {callResult && (
            <div className="mx-6 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
              <span className="font-semibold">✅ {callResult.message}</span>
            </div>
          )}

          {/* Start call button */}
          <div className="px-6 pb-4">
            <button
              onClick={handleCall}
              disabled={calling || !configured || (purpose === 'custom' && !customPrompt.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              {calling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting AI Call...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Start AI Call
                </>
              )}
            </button>
          </div>

          {/* Call History */}
          <div className="px-6 pb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Call History
            </h3>

            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : callHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No AI calls yet for this lead.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {callHistory.map(call => {
                  const st = STATUS_COLORS[call.status] || STATUS_COLORS.queued;
                  const purposeLabel = PURPOSE_OPTIONS.find(p => p.value === call.purpose)?.label || call.purpose;
                  return (
                    <div key={call._id} className="border border-gray-100 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{purposeLabel}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.text}`}>
                          {st.icon} {call.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>{new Date(call.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{formatDuration(call.duration)}</span>
                        {call.sentiment && (
                          <span className={call.sentiment === 'positive' ? 'text-green-500' : call.sentiment === 'negative' ? 'text-red-500' : 'text-gray-400'}>
                            {call.sentiment === 'positive' ? '😊' : call.sentiment === 'negative' ? '😔' : '😐'} {call.sentiment}
                          </span>
                        )}
                      </div>
                      {call.summary && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{call.summary}</p>
                      )}
                      {call.callEndedReason && call.status !== 'completed' && (
                        <p className="text-[10px] text-red-400 mt-0.5">{call.callEndedReason}</p>
                      )}
                      {call.crmUpdates?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {call.crmUpdates.map((u, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-medium">
                              Updated: {u.field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Powered by Retell.ai</span>
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
