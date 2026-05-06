'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Sparkles, Phone, Heart, Play, Handshake, CheckCircle, Trophy,
  Users, TrendingUp, RefreshCw, X, Eye, Clock,
  PauseCircle, Repeat, Flower2, Megaphone,
  BarChart3, ArrowRight,
} from 'lucide-react';
import LeadDetailModal from '@/components/admin/crm/LeadDetailModal';

const QR_SOURCE = 'qr_whatsapp';

// 4K color palette
const PALETTE = [
  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)' },
  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)' },
  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)' },
  { main: '#14B8A6', light: '#2DD4BF', bg: 'rgba(20,184,166,0.08)' },
  { main: '#A855F7', light: '#C084FC', bg: 'rgba(168,85,247,0.08)' },
];

const STAGE_ICONS: Record<string, any> = {
  sparkles: Sparkles, phone: Phone, heart: Heart, play: Play,
  handshake: Handshake, 'check-circle': CheckCircle, trophy: Trophy,
  'pause-circle': PauseCircle, repeat: Repeat, lotus: Flower2, megaphone: Megaphone,
};

interface FunnelStage {
  key: string; name: string; color: string; colorGradient: string;
  order: number; icon: string; isDefault: boolean; description: string;
}

interface Lead {
  _id: string; leadNumber?: string; name: string; phoneNumber: string;
  email?: string; status: string; labels: string[]; source: string;
  funnelStage: string; createdAt: string; updatedAt: string;
}

export default function QRFunnelReportPage() {
  const token = useAuth();

  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Fetch funnel config
  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/funnel/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStages((json.data?.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch leads by stage with QR filter
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ all: '1', source: QR_SOURCE });
      if (selectedStage) params.set('stage', selectedStage);

      const res = await fetch(`/api/admin/crm/funnel/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStageCounts(json.data?.stageCounts || {});
        setLeads(json.data?.leads || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, selectedStage]);

  useEffect(() => { fetchConfig(); }, [token]);
  useEffect(() => { fetchLeads(); }, [token, selectedStage]);

  const totalLeads = useMemo(() => Object.values(stageCounts).reduce((s, c) => s + c, 0), [stageCounts]);

  // Chart data
  const barData = useMemo(() => {
    return stages.map(s => ({
      name: s.name,
      count: stageCounts[s.key] || 0,
    }));
  }, [stages, stageCounts]);

  const pieData = useMemo(() => {
    return stages
      .filter(s => (stageCounts[s.key] || 0) > 0)
      .map(s => ({
        name: s.name,
        value: stageCounts[s.key] || 0,
      }));
  }, [stages, stageCounts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              QR WhatsApp — Funnel Report
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalLeads} total QR leads across {stages.length} stages</p>
          </div>
          <button onClick={() => { fetchConfig(); fetchLeads(); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Stage Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {stages.map((stage, i) => {
            const color = PALETTE[i % PALETTE.length];
            const count = stageCounts[stage.key] || 0;
            const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0';
            const Icon = STAGE_ICONS[stage.icon] || Sparkles;
            const isActive = selectedStage === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() => setSelectedStage(isActive ? '' : stage.key)}
                className={`relative rounded-xl p-3 border text-left transition-all hover:shadow-md ${isActive ? 'ring-2 ring-offset-1 shadow-md' : ''}`}
                style={{
                  background: color.bg,
                  borderColor: isActive ? color.main : 'rgba(0,0,0,0.06)',
                  ...(isActive ? { ringColor: color.main } : {}),
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: color.main }} />
                  <span className="text-xs font-medium text-gray-700 truncate">{stage.name}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: color.main }}>{count}</p>
                <p className="text-[10px] text-gray-400">{pct}%</p>
              </button>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Leads by Stage</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length].main} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribution</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length].main} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </div>
        </div>

        {/* Leads Table (when a stage is selected) */}
        {selectedStage && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {stages.find(s => s.key === selectedStage)?.name || selectedStage} — {leads.length} leads
              </h3>
              <button onClick={() => setSelectedStage('')} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : leads.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No leads in this stage</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Labels</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-400 text-xs">{lead.leadNumber || i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">{lead.phoneNumber}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(lead.labels || []).slice(0, 3).map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{l}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setSelectedLeadId(lead._id)} className="p-1 rounded hover:bg-green-50">
                          <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedLeadId && token && (
        <LeadDetailModal
          leadId={selectedLeadId}
          token={token}
          onClose={() => { setSelectedLeadId(null); fetchLeads(); }}
        />
      )}
    </div>
  );
}
