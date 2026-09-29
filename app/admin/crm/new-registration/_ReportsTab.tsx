'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, MessageCircle, Smartphone, Users, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, StopCircle, RefreshCw, Activity } from 'lucide-react';

interface BroadcastRun {
  _id: string;
  name: string;
  status: string;
  provider: string; // 'meta' | 'qr_bridge' | 'group'
  stats: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
    delivered?: number;
    read?: number;
    blocked?: number;
  };
  createdAt: string;
  scheduledAt?: string;
}

export default function ReportsTab() {
  const token = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'meta' | 'qr' | 'group'>('meta');
  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch runs
  const fetchRuns = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs?limit=500', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRuns(data.data?.runs || data.runs || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
  }, [token]);

  // Handle cancel
  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this broadcast?')) return;
    try {
      const res = await fetch(`/api/admin/crm/broadcast-runs/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Broadcast cancelled successfully');
        fetchRuns();
      } else {
        alert(data.error || 'Failed to cancel broadcast');
      }
    } catch (err) {
      alert('Error cancelling broadcast');
    }
  };

  // Filter runs by provider
  const filteredRuns = runs.filter(run => {
    if (activeSubTab === 'meta') return run.provider === 'meta';
    if (activeSubTab === 'qr') return run.provider === 'qr_bridge';
    if (activeSubTab === 'group') return run.provider === 'group'; // Assuming 'group' for group schedules
    return true;
  });

  // KPI Calculations
  const now = new Date();
  const todayRuns = filteredRuns.filter(r => new Date(r.createdAt).toDateString() === now.toDateString());
  const weeklyRuns = filteredRuns.filter(r => (now.getTime() - new Date(r.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000);
  const monthlyRuns = filteredRuns.filter(r => (now.getTime() - new Date(r.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000);

  const calculateKPI = (runsToCalc: BroadcastRun[]) => {
    return runsToCalc.reduce((acc, run) => ({
      total: acc.total + (run.stats?.total || 0),
      sent: acc.sent + (run.stats?.sent || 0),
      failed: acc.failed + (run.stats?.failed || 0),
      pending: acc.pending + (run.stats?.pending || 0),
    }), { total: 0, sent: 0, failed: 0, pending: 0 });
  };

  const todayStats = calculateKPI(todayRuns);
  const weeklyStats = calculateKPI(weeklyRuns);
  const monthlyStats = calculateKPI(monthlyRuns);
  const totalStats = calculateKPI(filteredRuns);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* ── Sub-tabs ── */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('meta')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeSubTab === 'meta'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2"><Smartphone size={16}/> Meta WhatsApp</div>
          </button>
          <button
            onClick={() => setActiveSubTab('qr')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeSubTab === 'qr'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2"><MessageCircle size={16}/> QR WhatsApp</div>
          </button>
          <button
            onClick={() => setActiveSubTab('group')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeSubTab === 'group'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2"><Users size={16}/> Group Message</div>
          </button>
        </div>
        
        <button onClick={fetchRuns} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* ── KPI Blocks ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
            <h3 className="text-indigo-100 text-sm font-bold mb-3 uppercase tracking-wider flex items-center justify-between">Today <Calendar size={16} /></h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div><div className="text-3xl font-black">{todayStats.total}</div><div className="text-xs text-indigo-200">Total Leads</div></div>
              <div><div className="text-3xl font-black">{todayStats.sent}</div><div className="text-xs text-indigo-200">Sent</div></div>
              <div><div className="text-xl font-bold">{todayStats.pending}</div><div className="text-xs text-indigo-200">Pending</div></div>
              <div><div className="text-xl font-bold">{todayStats.failed}</div><div className="text-xs text-indigo-200">Failed</div></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-md">
            <h3 className="text-blue-100 text-sm font-bold mb-3 uppercase tracking-wider flex items-center justify-between">Weekly <Calendar size={16} /></h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div><div className="text-3xl font-black">{weeklyStats.total}</div><div className="text-xs text-blue-200">Total Leads</div></div>
              <div><div className="text-3xl font-black">{weeklyStats.sent}</div><div className="text-xs text-blue-200">Sent</div></div>
              <div><div className="text-xl font-bold">{weeklyStats.pending}</div><div className="text-xs text-blue-200">Pending</div></div>
              <div><div className="text-xl font-bold">{weeklyStats.failed}</div><div className="text-xs text-blue-200">Failed</div></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
            <h3 className="text-emerald-100 text-sm font-bold mb-3 uppercase tracking-wider flex items-center justify-between">Monthly <Calendar size={16} /></h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div><div className="text-3xl font-black">{monthlyStats.total}</div><div className="text-xs text-emerald-200">Total Leads</div></div>
              <div><div className="text-3xl font-black">{monthlyStats.sent}</div><div className="text-xs text-emerald-200">Sent</div></div>
              <div><div className="text-xl font-bold">{monthlyStats.pending}</div><div className="text-xs text-emerald-200">Pending</div></div>
              <div><div className="text-xl font-bold">{monthlyStats.failed}</div><div className="text-xs text-emerald-200">Failed</div></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 opacity-50 z-0"></div>
            <div className="relative z-10">
              <h3 className="text-slate-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center justify-between">Total <BarChart3 size={16} /></h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                <div><div className="text-3xl font-black text-slate-800">{totalStats.total}</div><div className="text-xs text-slate-500 font-medium">Total Leads</div></div>
                <div><div className="text-3xl font-black text-emerald-600">{totalStats.sent}</div><div className="text-xs text-slate-500 font-medium">Sent</div></div>
                <div><div className="text-xl font-bold text-amber-500">{totalStats.pending}</div><div className="text-xs text-slate-500 font-medium">Pending</div></div>
                <div><div className="text-xl font-bold text-red-500">{totalStats.failed}</div><div className="text-xs text-slate-500 font-medium">Failed</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-indigo-500" /> Broadcast Details ({filteredRuns.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-4 py-4 border-b">Schedule/Send Message</th>
                  <th className="px-4 py-4 border-b">Total Leads</th>
                  <th className="px-4 py-4 border-b">Sent</th>
                  <th className="px-4 py-4 border-b">Failed</th>
                  <th className="px-4 py-4 border-b">Delivered</th>
                  <th className="px-4 py-4 border-b">Read</th>
                  <th className="px-4 py-4 border-b">Blocked</th>
                  <th className="px-4 py-4 border-b">Status</th>
                  <th className="px-4 py-4 border-b">Pending</th>
                  <th className="px-4 py-4 border-b">Date</th>
                  <th className="px-4 py-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto mb-2" />
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredRuns.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400 font-medium">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      No data found for this channel.
                    </td>
                  </tr>
                ) : (
                  filteredRuns.map((run) => (
                    <tr key={run._id} className="hover:bg-indigo-50/30 transition-colors text-sm">
                      <td className="px-4 py-4 font-semibold text-slate-800 max-w-[200px] truncate" title={run.name}>
                        {run.name}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-600">{run.stats?.total || 0}</td>
                      <td className="px-4 py-4 font-bold text-emerald-600">{run.stats?.sent || 0}</td>
                      <td className="px-4 py-4 font-bold text-red-500">{run.stats?.failed || 0}</td>
                      {/* Fake stats if not implemented in backend yet */}
                      <td className="px-4 py-4 text-emerald-500 font-medium">{run.stats?.delivered || '-'}</td>
                      <td className="px-4 py-4 text-blue-500 font-medium">{run.stats?.read || '-'}</td>
                      <td className="px-4 py-4 text-slate-500 font-medium">{run.stats?.blocked || '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          run.status === 'running' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
                          run.status === 'scheduled' ? 'bg-indigo-100 text-indigo-700' :
                          run.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {run.status === 'completed' && <CheckCircle size={12} />}
                          {run.status === 'running' && <Activity size={12} />}
                          {run.status === 'scheduled' && <Clock size={12} />}
                          {run.status === 'failed' && <AlertTriangle size={12} />}
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-amber-500">{run.stats?.pending || 0}</td>
                      <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{new Date(run.createdAt).toLocaleDateString('en-IN')}</div>
                        <div className="text-xs">{new Date(run.createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded hover:bg-indigo-50 transition-colors whitespace-nowrap">
                            View More
                          </button>
                          {(run.status === 'running' || run.status === 'scheduled' || run.status === 'pending') && (
                            <button 
                              onClick={() => handleCancel(run._id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 transition-colors whitespace-nowrap flex items-center gap-1">
                              <StopCircle size={12} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
