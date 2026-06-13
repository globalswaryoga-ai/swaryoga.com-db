'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader, BarChart3, ChevronDown, ChevronUp, RefreshCw, Save, Unlock } from 'lucide-react';

interface MemberSummary {
  userId: string;
  name: string;
  status: string;
  totalWatchSeconds: number;
  videoCount: number;
  sessionCount: number;
  lastWatched: string;
  videoQuota: { totalSecondsPerYear: number | null; perVideoSecondsPerYear: number | null };
  videoUsage: { yearKey: string | null; totalSeconds: number; perVideo: Record<string, number> };
}

interface PerVideoStat {
  _id: string;
  videoTitle: string;
  totalWatchSeconds: number;
  sessionCount: number;
  lastWatched: string;
  completedCount: number;
}

interface SessionLog {
  _id: string;
  videoId: string;
  videoTitle: string;
  watchStarted: string;
  watchEnded?: string;
  watchDuration: number;
  videoPosition: number;
  totalSeconds?: number;
  completed: boolean;
}

interface VideoAnalyticsPanelProps {
  activeTab: string;
  token: string | null;
  selectedCommunity: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function secondsToHours(seconds: number | null): string {
  if (seconds == null) return '';
  return String(Math.round((seconds / 3600) * 100) / 100);
}

export const VideoAnalyticsPanel: React.FC<VideoAnalyticsPanelProps> = ({ activeTab, token, selectedCommunity }) => {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ perVideo: PerVideoStat[]; sessions: SessionLog[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quotaEdits, setQuotaEdits] = useState<Record<string, { total: string; perVideo: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!token || !selectedCommunity) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/community/video-analytics?communityId=${encodeURIComponent(selectedCommunity)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
        const edits: Record<string, { total: string; perVideo: string }> = {};
        for (const m of data.members || []) {
          edits[m.userId] = {
            total: secondsToHours(m.videoQuota?.totalSecondsPerYear ?? null),
            perVideo: secondsToHours(m.videoQuota?.perVideoSecondsPerYear ?? null),
          };
        }
        setQuotaEdits(edits);
      }
    } catch (err) {
      console.error('[VideoAnalytics] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCommunity]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchSummary();
  }, [activeTab, fetchSummary]);

  const toggleExpand = async (userId: string) => {
    if (expanded === userId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(userId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/crm/community/video-analytics?communityId=${encodeURIComponent(selectedCommunity)}&userId=${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setDetail({ perVideo: data.perVideo || [], sessions: data.sessions || [] });
    } catch (err) {
      console.error('[VideoAnalytics] detail fetch error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveQuota = async (userId: string, reactivate = false) => {
    const edit = quotaEdits[userId] || { total: '', perVideo: '' };
    setSaving(userId);
    try {
      const hoursToSeconds = (v: string) => (v.trim() === '' ? null : Math.round(parseFloat(v) * 3600));
      const res = await fetch('/api/admin/crm/community/members/quota', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          communityId: selectedCommunity,
          userId,
          totalSecondsPerYear: hoursToSeconds(edit.total),
          perVideoSecondsPerYear: hoursToSeconds(edit.perVideo),
          reactivate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSummary();
      } else {
        alert('❌ ' + (data.error || 'Failed to save quota'));
      }
    } catch (err: any) {
      alert('❌ ' + (err?.message || 'Failed to save quota'));
    } finally {
      setSaving(null);
    }
  };

  if (activeTab !== 'analytics') return null;

  return (
    <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" /> Video Watch Analytics
            </h3>
            <p className="text-sm text-slate-500">Per-member watch time, repeat views, and yearly quotas</p>
          </div>
          <button
            onClick={fetchSummary}
            className="h-10 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold text-xs uppercase flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center text-slate-400 py-16">No video-watch activity recorded yet for this community.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="py-3 pr-4">Member</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Total Watch Time</th>
                  <th className="py-3 pr-4">Videos Watched</th>
                  <th className="py-3 pr-4">Sessions</th>
                  <th className="py-3 pr-4">Last Watched</th>
                  <th className="py-3 pr-4">Yearly Quota (hrs)</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((m) => (
                  <React.Fragment key={m.userId}>
                    <tr className="hover:bg-indigo-50/[0.15]">
                      <td className="py-3 pr-4 font-bold text-slate-900">
                        {m.name} <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">#{m.userId}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{formatDuration(m.totalWatchSeconds)}</td>
                      <td className="py-3 pr-4 text-slate-600">{m.videoCount}</td>
                      <td className="py-3 pr-4 text-slate-600">{m.sessionCount}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">
                        {m.lastWatched ? new Date(m.lastWatched).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Total/yr</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="∞"
                              value={quotaEdits[m.userId]?.total ?? ''}
                              onChange={(e) =>
                                setQuotaEdits((prev) => ({ ...prev, [m.userId]: { ...prev[m.userId], total: e.target.value } }))
                              }
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Per video/yr</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="∞"
                              value={quotaEdits[m.userId]?.perVideo ?? ''}
                              onChange={(e) =>
                                setQuotaEdits((prev) => ({ ...prev, [m.userId]: { ...prev[m.userId], perVideo: e.target.value } }))
                              }
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">
                          Used: {formatDuration(m.videoUsage?.totalSeconds || 0)} this year
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => saveQuota(m.userId)}
                            disabled={saving === m.userId}
                            className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-indigo-500 border border-indigo-100 disabled:opacity-50"
                            title="Save quota"
                          >
                            {saving === m.userId ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                          </button>
                          {m.status !== 'active' && (
                            <button
                              onClick={() => saveQuota(m.userId, true)}
                              disabled={saving === m.userId}
                              className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-emerald-600 border border-emerald-100 bg-emerald-50 disabled:opacity-50"
                              title="Reactivate access"
                            >
                              <Unlock size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => toggleExpand(m.userId)}
                            className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"
                            title="View details"
                          >
                            {expanded === m.userId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === m.userId && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50/60 p-4">
                          {detailLoading ? (
                            <div className="flex justify-center py-6">
                              <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                          ) : detail ? (
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Per-Video Totals</h4>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200">
                                      <th className="py-1.5 pr-3">Video</th>
                                      <th className="py-1.5 pr-3">Watch Time</th>
                                      <th className="py-1.5 pr-3">Times Watched</th>
                                      <th className="py-1.5 pr-3">Completed</th>
                                      <th className="py-1.5 pr-3">Last Watched</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {detail.perVideo.map((v) => (
                                      <tr key={v._id}>
                                        <td className="py-1.5 pr-3 font-semibold text-slate-700">{v.videoTitle || v._id}</td>
                                        <td className="py-1.5 pr-3">{formatDuration(v.totalWatchSeconds)}</td>
                                        <td className="py-1.5 pr-3">{v.sessionCount}</td>
                                        <td className="py-1.5 pr-3">{v.completedCount}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{new Date(v.lastWatched).toLocaleString('en-IN')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Recent Sessions</h4>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200">
                                      <th className="py-1.5 pr-3">Video</th>
                                      <th className="py-1.5 pr-3">Date &amp; Time</th>
                                      <th className="py-1.5 pr-3">Watched</th>
                                      <th className="py-1.5 pr-3">Position</th>
                                      <th className="py-1.5 pr-3">Completed</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {detail.sessions.map((s) => (
                                      <tr key={s._id}>
                                        <td className="py-1.5 pr-3 font-semibold text-slate-700">{s.videoTitle || s.videoId}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{new Date(s.watchStarted).toLocaleString('en-IN')}</td>
                                        <td className="py-1.5 pr-3">{formatDuration(s.watchDuration)}</td>
                                        <td className="py-1.5 pr-3">{s.totalSeconds ? `${formatDuration(s.videoPosition)} / ${formatDuration(s.totalSeconds)}` : formatDuration(s.videoPosition)}</td>
                                        <td className="py-1.5 pr-3">{s.completed ? '✅' : '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
