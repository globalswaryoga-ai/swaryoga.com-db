'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth-client';
import { Loader2, Users, Clock, MessageSquare, TrendingUp } from 'lucide-react';

interface AgentRow {
  userId: string;
  name: string;
  messagesSent: number;
  chatsHandled: number;
}

interface Analytics {
  days: number;
  summary: {
    totalInbound: number;
    totalOutbound: number;
    answeredChatDays: number;
    unansweredChatDays: number;
    avgFirstResponseMins: number | null;
    medianFirstResponseMins: number | null;
  };
  perAgent: AgentRow[];
  busiestHoursIST: Array<{ hour: number; count: number }>;
}

interface CsatStats {
  sent: number;
  rated: number;
  responseRate: number | null;
  avgRating: number | null;
  distribution: Record<number, number>;
  perAgent: Array<{ userId: string; name: string; responses: number; avgRating: number }>;
}

function fmtMins(mins: number | null): string {
  if (mins === null) return '—';
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  return `${(mins / 60).toFixed(1)} hr`;
}

function fmtHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function AgentReportPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [csat, setCsat] = useState<CsatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [res, csatRes] = await Promise.all([
          fetch(`/api/admin/crm/whatsapp/qr/agent-analytics?days=${days}`, { headers }),
          fetch(`/api/admin/crm/whatsapp/qr/csat?days=${days}`, { headers }),
        ]);
        const d = await res.json();
        const c = await csatRes.json();
        if (!cancelled) {
          if (d.success) setData(d);
          else setError(d.error || 'Failed to load analytics');
          setCsat(c.success ? c : null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  const maxHourCount = data ? Math.max(1, ...data.busiestHoursIST.map(h => h.count)) : 1;
  const answeredPct = data && (data.summary.answeredChatDays + data.summary.unansweredChatDays) > 0
    ? Math.round((data.summary.answeredChatDays / (data.summary.answeredChatDays + data.summary.unansweredChatDays)) * 100)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">📈 Agent Performance</h1>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-fit"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        ) : data ? (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><MessageSquare className="w-3.5 h-3.5" /> Messages in / out</div>
                <div className="text-2xl font-bold">{data.summary.totalInbound} <span className="text-gray-400 text-lg">/ {data.summary.totalOutbound}</span></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Avg first response</div>
                <div className="text-2xl font-bold">{fmtMins(data.summary.avgFirstResponseMins)}</div>
                <div className="text-[11px] text-gray-400">median {fmtMins(data.summary.medianFirstResponseMins)}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Chats answered</div>
                <div className="text-2xl font-bold">{answeredPct !== null ? `${answeredPct}%` : '—'}</div>
                <div className="text-[11px] text-gray-400">{data.summary.unansweredChatDays} unanswered chat-days</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Users className="w-3.5 h-3.5" /> Active agents</div>
                <div className="text-2xl font-bold">{data.perAgent.length}</div>
              </div>
            </div>

            {/* CSAT */}
            {csat && csat.sent > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-5 mb-8">
                <h2 className="font-semibold mb-3">⭐ Customer Ratings (CSAT)</h2>
                <div className="flex flex-wrap items-center gap-6 mb-3">
                  <div>
                    <div className="text-3xl font-bold">{csat.avgRating !== null ? `${csat.avgRating} / 5` : '—'}</div>
                    <div className="text-xs text-gray-500">average rating</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {csat.rated} of {csat.sent} requests answered
                    {csat.responseRate !== null && <span className="text-gray-400"> ({csat.responseRate}%)</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const max = Math.max(1, ...Object.values(csat.distribution));
                    return (
                      <div key={r} className="flex items-center gap-2 text-xs">
                        <span className="w-8 text-right text-gray-500">{r} ★</span>
                        <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded" style={{ width: `${((csat.distribution[r] || 0) / max) * 100}%` }} />
                        </div>
                        <span className="w-8 text-gray-600">{csat.distribution[r] || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-agent table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
              <div className="px-5 py-3 border-b"><h2 className="font-semibold">👥 Per Agent</h2></div>
              {data.perAgent.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">
                  No agent-attributed messages in this period. Replies sent from the QR inbox are attributed automatically.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b text-left">
                      <tr>
                        <th className="px-5 py-2.5 font-semibold">Agent</th>
                        <th className="px-5 py-2.5 font-semibold">Messages sent</th>
                        <th className="px-5 py-2.5 font-semibold">Chats handled</th>
                        <th className="px-5 py-2.5 font-semibold">Msgs / chat</th>
                        <th className="px-5 py-2.5 font-semibold">CSAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perAgent.map((a) => {
                        const agentCsat = csat?.perAgent.find((c) => c.userId === a.userId);
                        return (
                          <tr key={a.userId} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-5 py-2.5 font-medium">{a.name || a.userId}</td>
                            <td className="px-5 py-2.5">{a.messagesSent}</td>
                            <td className="px-5 py-2.5">{a.chatsHandled}</td>
                            <td className="px-5 py-2.5 text-gray-500">{a.chatsHandled > 0 ? (a.messagesSent / a.chatsHandled).toFixed(1) : '—'}</td>
                            <td className="px-5 py-2.5">{agentCsat ? `${agentCsat.avgRating} ★ (${agentCsat.responses})` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Busiest hours */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="font-semibold mb-4">🕐 Busiest Hours (incoming, IST)</h2>
              <div className="space-y-1">
                {data.busiestHoursIST.map(({ hour, count }) => (
                  <div key={hour} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-right text-gray-500 flex-shrink-0">{fmtHour(hour)}</span>
                    <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded transition-all"
                        style={{ width: `${(count / maxHourCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-gray-600 flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
