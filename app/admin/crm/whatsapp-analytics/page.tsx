'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { PageHeader, StatCard, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface WhatsAppStats {
  overview?: {
    currentMonth: { year: number; month: number; monthName: string };
    messages: {
      sent: number;
      received: number;
      delivered: number;
      read: number;
      failed: number;
      deliveryRate: number;
      readRate: number;
    };
    byProvider: Record<string, number>;
    expenses: {
      byCategory: Record<string, { total: number; count: number }>;
      total: number;
      marketing: number;
      utility: number;
      whatsapp_api: number;
    };
  };
  daily?: Array<{ date: string; sent: number; delivered: number; read: number; failed: number }>;
  weekly?: Array<{ year: number; week: number; sent: number; delivered: number; read: number; failed: number }>;
  monthly?: Array<{
    year: number;
    month: number;
    monthName: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    expenses: { marketing: number; utility: number; whatsapp_api: number; total: number };
  }>;
  yearly?: Array<{ year: number; sent: number; delivered: number; read: number; failed: number }>;
  byAdmin?: Array<{ adminUser: string; sent: number; delivered: number; read: number; failed: number; deliveryRate: number }>;
}

interface Expense {
  _id: string;
  category: string;
  subCategory?: string;
  amount: number;
  title?: string;
  description?: string;
  expenseDate: string;
  createdByUserId?: string;
  approved?: boolean;
}

interface MetaStatus {
  phone?: {
    id: string;
    displayNumber: string;
    verifiedName: string;
    qualityRating: 'HIGH' | 'MEDIUM' | 'LOW';
    messagingLimitTier: string;
    currentLimit: number;
    isOfficialBusinessAccount: boolean;
    accountMode: string;
    status: string;
    nameStatus: string;
    codeVerificationStatus: string;
    platformType: string;
  };
  waba?: {
    id: string;
    name: string;
    accountReviewStatus: string;
    businessVerificationStatus: string;
    ownershipType: string;
    timezoneId: string;
  };
  templates?: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    byCategory: {
      marketing: number;
      utility: number;
      authentication: number;
    };
  };
  fetchedAt: string;
}

// Simple bar chart component
function BarChart({ data, maxValue, color = 'emerald' }: { data: { label: string; value: number }[]; maxValue: number; color?: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-20 text-xs text-slate-600 font-semibold truncate">{item.label}</div>
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[color]} rounded-full transition-all`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <div className="w-16 text-right text-xs font-bold text-slate-900">{item.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// Line chart using SVG
function LineChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return null;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = data.length * 40;
  const padding = 30;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((d.value / maxValue) * (height - padding * 2));
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(width, 400)} height={height} className="min-w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = height - padding - ((pct / 100) * (height - padding * 2));
          return (
            <g key={pct}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={5} y={y + 4} fontSize="10" fill="#64748b">{Math.round(maxValue * pct / 100)}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" />
        {/* Points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#10b981" />
            <text x={p.x} y={height - 5} fontSize="10" fill="#64748b" textAnchor="middle">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function WhatsAppAnalyticsPage() {
  const router = useRouter();
  const token = useAuth();

  const [stats, setStats] = useState<WhatsAppStats>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'by-admin' | 'expenses'>('overview');
  
  // Date filters
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'marketing',
    subCategory: '',
    amount: '',
    title: '',
    description: '',
    expenseDate: new Date().toISOString().slice(0, 10),
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, expensesRes, metaRes] = await Promise.all([
        fetch(`/api/admin/crm/analytics/whatsapp?view=all&startDate=${startDate}&endDate=${endDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/crm/expenses?startDate=${startDate}&endDate=${endDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/analytics/meta-status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) setStats(data.data);
      }

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        if (data.success) setExpenses(data.data.expenses || []);
      }

      if (metaRes.ok) {
        const data = await metaRes.json();
        if (data.success) setMetaStatus(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    fetchData();
  }, [token, router, fetchData]);

  const handleAddExpense = async () => {
    if (!token || !expenseForm.amount) return;
    setSavingExpense(true);
    try {
      const res = await fetch('/api/admin/crm/expenses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
        }),
      });
      if (res.ok) {
        setShowExpenseForm(false);
        setExpenseForm({
          category: 'marketing',
          subCategory: '',
          amount: '',
          title: '',
          description: '',
          expenseDate: new Date().toISOString().slice(0, 10),
        });
        fetchData();
      }
    } catch (err) {
      setError('Failed to add expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'daily', label: 'Daily', icon: '📅' },
    { id: 'weekly', label: 'Weekly', icon: '📆' },
    { id: 'monthly', label: 'Monthly', icon: '🗓️' },
    { id: 'yearly', label: 'Yearly', icon: '📈' },
    { id: 'by-admin', label: 'By Admin', icon: '👥' },
    { id: 'expenses', label: 'Expenses', icon: '💰' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader title="WhatsApp Analytics & Expenses" />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* Date Range Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              onClick={fetchData}
              className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats.overview && (
              <div className="space-y-6">
                <div className="text-lg font-bold text-slate-900">
                  {stats.overview.currentMonth.monthName} {stats.overview.currentMonth.year}
                </div>

                {/* Meta Account Status */}
                {metaStatus && (
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-6 shadow-lg text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                          📱
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{metaStatus.phone?.verifiedName || 'Swar Yoga'}</h3>
                          <p className="text-emerald-100">{metaStatus.phone?.displayNumber}</p>
                          <p className="text-xs text-emerald-200 mt-1">
                            Status: <span className="font-semibold">{metaStatus.phone?.status === 'CONNECTED' ? '✅ Connected' : metaStatus.phone?.status || 'Unknown'}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Quality Rating */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className={`text-3xl font-black ${
                            metaStatus.phone?.qualityRating === 'HIGH' ? 'text-white' :
                            metaStatus.phone?.qualityRating === 'MEDIUM' ? 'text-yellow-200' : 'text-red-200'
                          }`}>
                            {metaStatus.phone?.qualityRating === 'HIGH' ? '🟢' : 
                             metaStatus.phone?.qualityRating === 'MEDIUM' ? '🟡' : '🔴'}
                            {' '}{metaStatus.phone?.qualityRating || 'N/A'}
                          </div>
                          <p className="text-xs text-emerald-200 mt-1">Quality Rating</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-black text-white">
                            {metaStatus.phone?.messagingLimitTier?.replace('TIER_', '').replace('K', 'K') || 'N/A'}
                          </div>
                          <p className="text-xs text-emerald-200 mt-1">Msg Limit/Day</p>
                        </div>

                        {metaStatus.phone?.isOfficialBusinessAccount && (
                          <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
                            <div className="text-lg">✓</div>
                            <p className="text-xs text-emerald-200">Official</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Template Stats */}
                    {metaStatus.templates && (
                      <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{metaStatus.templates.total}</div>
                          <div className="text-xs text-emerald-200">Total Templates</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">✅ {metaStatus.templates.approved}</div>
                          <div className="text-xs text-emerald-200">Approved</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-200">⏳ {metaStatus.templates.pending}</div>
                          <div className="text-xs text-emerald-200">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{metaStatus.templates.byCategory.marketing}</div>
                          <div className="text-xs text-emerald-200">Marketing</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{metaStatus.templates.byCategory.utility}</div>
                          <div className="text-xs text-emerald-200">Utility</div>
                        </div>
                      </div>
                    )}

                    {/* WABA Info */}
                    {metaStatus.waba && (
                      <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-4 text-xs text-emerald-200">
                        <span>WABA: <strong className="text-white">{metaStatus.waba.name}</strong></span>
                        <span>Business: <strong className="text-white">{metaStatus.waba.businessVerificationStatus || 'Not verified'}</strong></span>
                        <span>Mode: <strong className="text-white">{metaStatus.phone?.accountMode || 'LIVE'}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <StatCard label="Sent" value={stats.overview.messages.sent.toString()} icon="📤" color="blue" />
                  <StatCard label="Received" value={stats.overview.messages.received.toString()} icon="📥" color="purple" />
                  <StatCard label="Delivered" value={stats.overview.messages.delivered.toString()} icon="✅" color="green" />
                  <StatCard label="Read" value={stats.overview.messages.read.toString()} icon="👀" color="teal" />
                  <StatCard label="Failed" value={stats.overview.messages.failed.toString()} icon="❌" color="red" />
                  <StatCard label="Delivery %" value={`${stats.overview.messages.deliveryRate}%`} icon="📊" color="indigo" />
                  <StatCard label="Read %" value={`${stats.overview.messages.readRate}%`} icon="📈" color="orange" />
                </div>

                {/* Provider breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Messages by Provider</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.overview.byProvider || {}).map(([provider, count]) => (
                      <div key={provider} className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-600">{count.toLocaleString()}</div>
                        <div className="text-xs text-slate-600 font-semibold mt-1 capitalize">{provider || 'Unknown'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Monthly Expenses</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-rose-50 rounded-xl p-4">
                      <div className="text-xs text-rose-600 font-bold">Marketing</div>
                      <div className="text-2xl font-black text-rose-700">₹{stats.overview.expenses.marketing.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-xs text-blue-600 font-bold">Utility</div>
                      <div className="text-2xl font-black text-blue-700">₹{stats.overview.expenses.utility.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="text-xs text-purple-600 font-bold">WhatsApp API</div>
                      <div className="text-2xl font-black text-purple-700">₹{stats.overview.expenses.whatsapp_api.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-100 rounded-xl p-4">
                      <div className="text-xs text-slate-600 font-bold">Total</div>
                      <div className="text-2xl font-black text-slate-900">₹{stats.overview.expenses.total.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Tab */}
            {activeTab === 'daily' && stats.daily && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Daily WhatsApp Messages</h3>
                <LineChart
                  data={stats.daily.slice(-30).map((d) => ({ label: d.date.slice(-5), value: d.sent }))}
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold text-slate-600">Date</th>
                        <th className="text-right py-2 font-bold text-slate-600">Sent</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivered</th>
                        <th className="text-right py-2 font-bold text-slate-600">Read</th>
                        <th className="text-right py-2 font-bold text-slate-600">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.daily.slice().reverse().map((day, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-900">{day.date}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{day.sent}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{day.delivered}</td>
                          <td className="py-2 text-right font-bold text-teal-600">{day.read}</td>
                          <td className="py-2 text-right font-bold text-red-600">{day.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Weekly Tab */}
            {activeTab === 'weekly' && stats.weekly && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Weekly WhatsApp Messages</h3>
                <BarChart
                  data={stats.weekly.map((w) => ({ label: `W${w.week}`, value: w.sent }))}
                  maxValue={Math.max(...stats.weekly.map((w) => w.sent), 1)}
                  color="blue"
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold text-slate-600">Year/Week</th>
                        <th className="text-right py-2 font-bold text-slate-600">Sent</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivered</th>
                        <th className="text-right py-2 font-bold text-slate-600">Read</th>
                        <th className="text-right py-2 font-bold text-slate-600">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.weekly.slice().reverse().map((week, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-900">{week.year} W{week.week}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{week.sent}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{week.delivered}</td>
                          <td className="py-2 text-right font-bold text-teal-600">{week.read}</td>
                          <td className="py-2 text-right font-bold text-red-600">{week.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Monthly Tab */}
            {activeTab === 'monthly' && stats.monthly && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Monthly WhatsApp Messages & Expenses</h3>
                <BarChart
                  data={stats.monthly.map((m) => ({ label: m.monthName, value: m.sent }))}
                  maxValue={Math.max(...stats.monthly.map((m) => m.sent), 1)}
                  color="emerald"
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold text-slate-600">Month</th>
                        <th className="text-right py-2 font-bold text-slate-600">Sent</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivered</th>
                        <th className="text-right py-2 font-bold text-slate-600">Read</th>
                        <th className="text-right py-2 font-bold text-slate-600">Failed</th>
                        <th className="text-right py-2 font-bold text-rose-600">Marketing ₹</th>
                        <th className="text-right py-2 font-bold text-blue-600">Utility ₹</th>
                        <th className="text-right py-2 font-bold text-slate-900">Total Exp ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.monthly.slice().reverse().map((month, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-900">{month.monthName} {month.year}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{month.sent}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{month.delivered}</td>
                          <td className="py-2 text-right font-bold text-teal-600">{month.read}</td>
                          <td className="py-2 text-right font-bold text-red-600">{month.failed}</td>
                          <td className="py-2 text-right font-bold text-rose-600">{month.expenses?.marketing?.toLocaleString() || 0}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{month.expenses?.utility?.toLocaleString() || 0}</td>
                          <td className="py-2 text-right font-black text-slate-900">{month.expenses?.total?.toLocaleString() || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Yearly Tab */}
            {activeTab === 'yearly' && stats.yearly && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Yearly WhatsApp Messages</h3>
                <BarChart
                  data={stats.yearly.map((y) => ({ label: y.year.toString(), value: y.sent }))}
                  maxValue={Math.max(...stats.yearly.map((y) => y.sent), 1)}
                  color="purple"
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold text-slate-600">Year</th>
                        <th className="text-right py-2 font-bold text-slate-600">Sent</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivered</th>
                        <th className="text-right py-2 font-bold text-slate-600">Read</th>
                        <th className="text-right py-2 font-bold text-slate-600">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.yearly.slice().reverse().map((year, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-900">{year.year}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{year.sent.toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{year.delivered.toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-teal-600">{year.read.toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-red-600">{year.failed.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* By Admin Tab */}
            {activeTab === 'by-admin' && stats.byAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Messages by Admin User</h3>
                <BarChart
                  data={stats.byAdmin.map((a) => ({ label: a.adminUser, value: a.sent }))}
                  maxValue={Math.max(...stats.byAdmin.map((a) => a.sent), 1)}
                  color="orange"
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-bold text-slate-600">Admin User</th>
                        <th className="text-right py-2 font-bold text-slate-600">Sent</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivered</th>
                        <th className="text-right py-2 font-bold text-slate-600">Read</th>
                        <th className="text-right py-2 font-bold text-slate-600">Failed</th>
                        <th className="text-right py-2 font-bold text-slate-600">Delivery %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byAdmin.map((admin, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 font-semibold text-slate-900">{admin.adminUser}</td>
                          <td className="py-2 text-right font-bold text-blue-600">{admin.sent}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{admin.delivered}</td>
                          <td className="py-2 text-right font-bold text-teal-600">{admin.read}</td>
                          <td className="py-2 text-right font-bold text-red-600">{admin.failed}</td>
                          <td className="py-2 text-right font-bold text-purple-600">{admin.deliveryRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Expense Records</h3>
                  <button
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
                  >
                    + Add Expense
                  </button>
                </div>

                {/* Add Expense Form */}
                {showExpenseForm && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="font-bold text-slate-900 mb-4">Add New Expense</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Category</label>
                        <select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        >
                          <option value="marketing">Marketing</option>
                          <option value="utility">Utility</option>
                          <option value="whatsapp_api">WhatsApp API</option>
                          <option value="software">Software</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Date</label>
                        <input
                          type="date"
                          value={expenseForm.expenseDate}
                          onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Title</label>
                        <input
                          type="text"
                          value={expenseForm.title}
                          onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          placeholder="Expense title"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Description</label>
                        <input
                          type="text"
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddExpense}
                        disabled={savingExpense || !expenseForm.amount}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {savingExpense ? 'Saving...' : 'Save Expense'}
                      </button>
                      <button
                        onClick={() => setShowExpenseForm(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expenses List */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-bold text-slate-600">Date</th>
                          <th className="text-left py-2 font-bold text-slate-600">Category</th>
                          <th className="text-left py-2 font-bold text-slate-600">Title</th>
                          <th className="text-right py-2 font-bold text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              No expenses recorded for this period
                            </td>
                          </tr>
                        ) : (
                          expenses.map((expense) => (
                            <tr key={expense._id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                              <td className="py-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  expense.category === 'marketing' ? 'bg-rose-100 text-rose-700' :
                                  expense.category === 'utility' ? 'bg-blue-100 text-blue-700' :
                                  expense.category === 'whatsapp_api' ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {expense.category}
                                </span>
                              </td>
                              <td className="py-2 text-slate-900">{expense.title || '-'}</td>
                              <td className="py-2 text-right font-bold text-slate-900">₹{expense.amount.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
