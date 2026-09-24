'use client';

import { useCallback, useEffect, useState } from 'react';
import { getToken } from '@/lib/auth-client';
import { Loader2, Plus, Trash2, X, Users, Play, Pause } from 'lucide-react';

interface DripStep {
  dayOffset: number;
  timeOfDay: string;
  messageText: string;
}

interface DripSequence {
  id: string;
  name: string;
  active: boolean;
  stopOnReply: boolean;
  steps: DripStep[];
  enrollments: { active: number; completed: number; stopped: number };
  createdAt: string;
}

const EMPTY_STEP: DripStep = { dayOffset: 0, timeOfDay: '09:00', messageText: '' };

export default function DripSequencesPage() {
  const [sequences, setSequences] = useState<DripSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [stopOnReply, setStopOnReply] = useState(true);
  const [steps, setSteps] = useState<DripStep[]>([{ ...EMPTY_STEP }]);
  const [saving, setSaving] = useState(false);
  const [enrollFor, setEnrollFor] = useState<DripSequence | null>(null);
  const [enrollPhones, setEnrollPhones] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState('');

  const api = useCallback(async (method: string, path = '', body?: any) => {
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/whatsapp/qr/drip${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api('GET');
      if (d.success) { setSequences(d.sequences); setError(''); }
      else setError(d.error || 'Failed to load');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || steps.some(s => !s.messageText.trim())) {
      setError('Sequence name and every step message are required');
      return;
    }
    setSaving(true);
    try {
      const d = await api('POST', '', { name: name.trim(), stopOnReply, steps });
      if (d.success) {
        setShowCreate(false);
        setName('');
        setSteps([{ ...EMPTY_STEP }]);
        setStopOnReply(true);
        await load();
      } else setError(d.error || 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (seq: DripSequence) => {
    await api('PUT', '', { id: seq.id, active: !seq.active });
    await load();
  };

  const handleDelete = async (seq: DripSequence) => {
    if (!confirm(`Delete "${seq.name}"? Active enrollments will be stopped.`)) return;
    await api('DELETE', '', { id: seq.id });
    await load();
  };

  const handleEnroll = async () => {
    if (!enrollFor) return;
    const phones = enrollPhones.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
    if (phones.length === 0) return;
    setEnrolling(true);
    setEnrollResult('');
    try {
      const d = await api('POST', '/enroll', { sequenceId: enrollFor.id, phones });
      if (d.success) {
        setEnrollResult(`✅ ${d.enrolled} enrolled${d.skippedDuplicate ? `, ${d.skippedDuplicate} already enrolled` : ''}${d.skippedOptedOut ? `, ${d.skippedOptedOut} opted-out skipped` : ''}${d.skippedInvalid ? `, ${d.skippedInvalid} invalid` : ''}`);
        setEnrollPhones('');
        await load();
      } else setEnrollResult(`❌ ${d.error}`);
    } finally { setEnrolling(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">💧 Drip Sequences</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Sequence
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
          Multi-step journeys: Day 0 welcome → Day 3 video → Day 7 offer. Sends respect the
          5AM–10PM IST window, daily/hourly safety caps, and the opt-out list. When a contact
          replies, their journey stops automatically (stop-on-reply).
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
        ) : sequences.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-gray-500 text-sm">
            No sequences yet. Create one to start automated lead journeys.
          </div>
        ) : (
          <div className="space-y-4">
            {sequences.map((seq) => (
              <div key={seq.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      {seq.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${seq.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {seq.active ? 'active' : 'paused'}
                      </span>
                      {seq.stopOnReply && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">stops on reply</span>}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {seq.steps.length} step{seq.steps.length > 1 ? 's' : ''} ·
                      👥 {seq.enrollments.active} active · ✅ {seq.enrollments.completed} completed · ⏹ {seq.enrollments.stopped} stopped
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEnrollFor(seq); setEnrollResult(''); }}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-600"
                      title="Enroll contacts"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(seq)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      title={seq.active ? 'Pause' : 'Resume'}
                    >
                      {seq.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(seq)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {seq.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-semibold text-gray-500 flex-shrink-0 w-20">Day {s.dayOffset} · {s.timeOfDay}</span>
                      <span className="text-gray-700 whitespace-pre-wrap break-words">{s.messageText.length > 180 ? s.messageText.slice(0, 180) + '…' : s.messageText}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-bold">💧 New Drip Sequence</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sequence Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New lead welcome journey"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={stopOnReply} onChange={(e) => setStopOnReply(e.target.checked)} className="rounded" />
                  Stop the journey when the contact replies (recommended)
                </label>
                <div>
                  <label className="block text-sm font-medium mb-2">Steps</label>
                  <div className="space-y-3">
                    {steps.map((s, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Day</label>
                          <input
                            type="number" min={0} max={365} value={s.dayOffset}
                            onChange={(e) => setSteps(prev => prev.map((p, i) => i === idx ? { ...p, dayOffset: parseInt(e.target.value, 10) || 0 } : p))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <label className="text-xs text-gray-500 ml-2">at</label>
                          <input
                            type="time" value={s.timeOfDay}
                            onChange={(e) => setSteps(prev => prev.map((p, i) => i === idx ? { ...p, timeOfDay: e.target.value } : p))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-[10px] text-gray-400">IST</span>
                          {steps.length > 1 && (
                            <button onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))} className="ml-auto text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={s.messageText}
                          onChange={(e) => setSteps(prev => prev.map((p, i) => i === idx ? { ...p, messageText: e.target.value } : p))}
                          placeholder="Message for this step…"
                          rows={2}
                          maxLength={4000}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  {steps.length < 30 && (
                    <button
                      onClick={() => setSteps(prev => [...prev, { ...EMPTY_STEP, dayOffset: (prev[prev.length - 1]?.dayOffset || 0) + 2 }])}
                      className="text-sm text-green-600 hover:text-green-700 font-medium mt-2"
                    >
                      + Add step
                    </button>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300"
                >
                  {saving ? 'Creating…' : 'Create Sequence'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enroll modal */}
        {enrollFor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">👥 Enroll in "{enrollFor.name}"</h3>
                <button onClick={() => setEnrollFor(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <textarea
                value={enrollPhones}
                onChange={(e) => setEnrollPhones(e.target.value)}
                placeholder={'Phone numbers, one per line or comma-separated\n919876543210\n918765432109'}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono mb-2"
              />
              <p className="text-xs text-gray-500 mb-3">
                {enrollPhones.split(/[\n,]+/).filter(p => p.trim()).length} numbers · opted-out contacts are skipped automatically
              </p>
              {enrollResult && <p className="text-sm mb-3">{enrollResult}</p>}
              <button
                onClick={handleEnroll}
                disabled={enrolling || !enrollPhones.trim()}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300"
              >
                {enrolling ? 'Enrolling…' : 'Enroll Contacts'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
