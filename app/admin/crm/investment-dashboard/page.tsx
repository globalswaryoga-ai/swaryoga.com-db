'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/investment-utils';
import {
  ENTITIES,
  ENTITY_NAMES,
  SHARE_TYPES,
  SHARE_TYPE_NAMES,
  INVESTMENT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/investment-constants';
import { X, Plus, TrendingUp, Users, DollarSign, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface Investment {
  _id: string;
  entity: 'swar-sakshi' | 'upamanyu';
  shareType?: 'equity' | 'preference';
  name?: string;
  phone?: string;
  amount: number;
  numberOfShares?: number;
  sharePrice?: number;
  interestRate?: number;
  dividendRate?: number;
  compound?: boolean;
  startDate: string;
  endDate: string;
  status: string;
  certificateNumber?: string;
  maturityAmount?: number;
  paidDividend?: number;
  pendingDividend?: number;
  notes?: string;
  isOldInvestment?: boolean;
  createdAt: string;
}

interface DashboardStats {
  totalInvestments: number;
  totalAmount: number;
  swarsakhiTotal: number;
  upamanyuTotal: number;
  swarsakhiInvestors: number;
  upamanyuInvestors: number;
  thisMonthMaturity: number;
  thisMonthMaturityCount: number;
  pendingDividends: number;
}

interface FormData {
  entity: 'swar-sakshi' | 'upamanyu';
  name: string;
  phone: string;
  amount: string;
  startDate: string;
  endDate: string;
  shareType: 'equity' | 'preference' | '';
  numberOfShares: string;
  sharePrice: string;
  interestRate: string;
  dividendRate: string;
  compound: boolean;
  notes: string;
  isOldInvestment: boolean;
  earlyRefundAllowed: boolean;
}

const defaultForm: FormData = {
  entity: 'swar-sakshi',
  name: '',
  phone: '',
  amount: '',
  startDate: '',
  endDate: '',
  shareType: '',
  numberOfShares: '',
  sharePrice: '',
  interestRate: '12',
  dividendRate: '',
  compound: false,
  notes: '',
  isOldInvestment: false,
  earlyRefundAllowed: false,
};

export default function InvestmentDashboard() {
  const token = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvestments: 0,
    totalAmount: 0,
    swarsakhiTotal: 0,
    upamanyuTotal: 0,
    swarsakhiInvestors: 0,
    upamanyuInvestors: 0,
    thisMonthMaturity: 0,
    thisMonthMaturityCount: 0,
    pendingDividends: 0,
  });
  const [sharePremium, setSharePremium] = useState(0);
  const [editingPremium, setEditingPremium] = useState(false);
  const [premiumInput, setPremiumInput] = useState('0');
  const [thisMonthMaturityInvestments, setThisMonthMaturityInvestments] = useState<Investment[]>([]);

  // Add Investment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table filter
  const [filterEntity, setFilterEntity] = useState<'all' | 'swar-sakshi' | 'upamanyu'>('all');
  const [searchText, setSearchText] = useState('');

  const fetchInvestments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/crm/investments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const invList: Investment[] = data.investments || [];
        setInvestments(invList);
        calculateStats(invList);
      } else {
        setError('Failed to load investments');
      }
    } catch {
      setError('Failed to load investments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token !== null) fetchInvestments();
  }, [token, fetchInvestments]);

  useEffect(() => {
    const saved = localStorage.getItem('sharePremiumValue');
    if (saved) {
      const val = parseFloat(saved);
      setSharePremium(val);
      setPremiumInput(val.toString());
    }
  }, []);

  const calculateStats = (invList: Investment[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalAmount = 0;
    let swarsakhiTotal = 0;
    let upamanyuTotal = 0;
    const swarsakhiInvestors = new Set<string>();
    const upamanyuInvestors = new Set<string>();
    let thisMonthMaturity = 0;
    let thisMonthMaturityCount = 0;
    let pendingDividends = 0;
    const monthlyMaturity: Investment[] = [];

    invList.forEach((inv) => {
      totalAmount += inv.amount;
      pendingDividends += inv.pendingDividend || 0;

      if (inv.entity === 'swar-sakshi') {
        swarsakhiTotal += inv.amount;
        if (inv.phone) swarsakhiInvestors.add(inv.phone);
      } else if (inv.entity === 'upamanyu') {
        upamanyuTotal += inv.amount;
        if (inv.phone) upamanyuInvestors.add(inv.phone);
      }

      const endDate = new Date(inv.endDate);
      if (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) {
        thisMonthMaturity += inv.maturityAmount || inv.amount;
        thisMonthMaturityCount++;
        monthlyMaturity.push(inv);
      }
    });

    setStats({
      totalInvestments: invList.length,
      totalAmount,
      swarsakhiTotal,
      upamanyuTotal,
      swarsakhiInvestors: swarsakhiInvestors.size,
      upamanyuInvestors: upamanyuInvestors.size,
      thisMonthMaturity,
      thisMonthMaturityCount,
      pendingDividends,
    });
    setThisMonthMaturityInvestments(
      monthlyMaturity.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    );
  };

  const totalShares = investments.reduce(
    (total, inv) => (inv.entity === 'upamanyu' && inv.numberOfShares ? total + inv.numberOfShares : total),
    0
  );

  const handleSavePremium = () => {
    const val = parseFloat(premiumInput) || 0;
    setSharePremium(val);
    localStorage.setItem('sharePremiumValue', val.toString());
    setEditingPremium(false);
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.entity || !form.amount || !form.startDate || !form.endDate) {
      setSubmitMsg({ type: 'error', text: 'Entity, amount, start date, and end date are required.' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const body: Record<string, unknown> = {
        entity: form.entity,
        amount: parseFloat(form.amount),
        startDate: form.startDate,
        endDate: form.endDate,
        compound: form.compound,
        isOldInvestment: form.isOldInvestment,
        earlyRefundAllowed: form.earlyRefundAllowed,
        refundRule: form.earlyRefundAllowed ? 'refund_at_maturity' : 'early_refund_blocked',
      };
      if (form.name) body.name = form.name;
      if (form.phone) body.phone = form.phone;
      if (form.notes) body.notes = form.notes;
      if (form.entity === 'upamanyu' && form.shareType) body.shareType = form.shareType;
      if (form.numberOfShares) body.numberOfShares = parseFloat(form.numberOfShares);
      if (form.sharePrice) body.sharePrice = parseFloat(form.sharePrice);
      if (form.interestRate) body.interestRate = parseFloat(form.interestRate);
      if (form.dividendRate) body.dividendRate = parseFloat(form.dividendRate);

      const res = await fetch('/api/investment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create investment');
      setSubmitMsg({ type: 'success', text: `Investment created! Certificate: ${data.certificateNumber}` });
      setForm(defaultForm);
      fetchInvestments();
    } catch (err: unknown) {
      setSubmitMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create investment' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvestments = investments.filter((inv) => {
    if (filterEntity !== 'all' && inv.entity !== filterEntity) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return (
        (inv.name || '').toLowerCase().includes(q) ||
        (inv.phone || '').includes(q) ||
        (inv.certificateNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all investments across Swar Sakshi & Upamanyu</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setSubmitMsg(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Investment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Investments" value={stats.totalInvestments} icon={TrendingUp} color="indigo" />
            <KpiCard label="Total Amount" value={formatCurrency(stats.totalAmount)} icon={DollarSign} color="green" />
            <KpiCard
              label="This Month Maturity"
              value={formatCurrency(stats.thisMonthMaturity)}
              sub={`${stats.thisMonthMaturityCount} investments`}
              icon={Calendar}
              color="orange"
            />
            <KpiCard label="Pending Dividends" value={formatCurrency(stats.pendingDividends)} icon={AlertCircle} color="red" />
          </div>

          {/* Entity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Swar Sakshi */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white">
                <h3 className="text-lg font-bold">Swar Sakshi</h3>
                <p className="text-green-100 text-sm">12% Fixed Dividend Investment</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Investment</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.swarsakhiTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Investors</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.swarsakhiInvestors}</p>
                </div>
                <div className="col-span-2 bg-amber-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Expected Annual Dividend (12%)</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(stats.swarsakhiTotal * 0.12)}</p>
                </div>
              </div>
            </div>

            {/* Upamanyu */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 text-white">
                <h3 className="text-lg font-bold">Upamanyu</h3>
                <p className="text-purple-100 text-sm">Equity & Preference Shares</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Investment</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(stats.upamanyuTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Investors</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.upamanyuInvestors}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Shares</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">{totalShares.toLocaleString()}</p>
                </div>
                <div className="bg-teal-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Face Value (₹10/share)</p>
                  <p className="text-xl font-bold text-teal-600 mt-1">{formatCurrency(totalShares * 10)}</p>
                </div>
              </div>
              {/* Premium Value */}
              <div className="px-6 pb-5">
                <div className="bg-indigo-50 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Premium Value (₹{sharePremium}/share)</p>
                    {!editingPremium && (
                      <button onClick={() => setEditingPremium(true)} className="text-xs text-indigo-600 underline">Edit</button>
                    )}
                  </div>
                  {editingPremium ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={premiumInput}
                        onChange={(e) => setPremiumInput(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button onClick={handleSavePremium} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Save</button>
                      <button onClick={() => setEditingPremium(false)} className="px-3 py-1 border border-gray-300 rounded text-sm">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-indigo-600">{formatCurrency(totalShares * sharePremium)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* This Month Maturity */}
          {thisMonthMaturityInvestments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
                <h3 className="text-lg font-bold">This Month's Maturity Payments</h3>
                <p className="text-orange-100 text-sm">{thisMonthMaturityInvestments.length} investments maturing this month</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Investor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Maturity Amount</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {thisMonthMaturityInvestments.map((inv) => (
                      <tr key={inv._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{inv.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                            {inv.entity === 'swar-sakshi' ? 'Swar Sakshi' : 'Upamanyu'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(inv.maturityAmount || inv.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                            {formatDate(inv.endDate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Investments Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="text-base font-bold text-gray-900 flex-1">All Investments ({filteredInvestments.length})</h3>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'swar-sakshi', 'upamanyu'] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setFilterEntity(e)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterEntity === e
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {e === 'all' ? 'All' : e === 'swar-sakshi' ? 'Swar Sakshi' : 'Upamanyu'}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Search name / phone..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
                />
              </div>
            </div>

            {filteredInvestments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No investments found. Add your first investment using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Investor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Start</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">End</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvestments.map((inv) => (
                      <tr key={inv._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{inv.name || '—'}</p>
                          {inv.phone && <p className="text-xs text-gray-400">{inv.phone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            inv.entity === 'swar-sakshi'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {inv.entity === 'swar-sakshi' ? 'Swar Sakshi' : 'Upamanyu'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {inv.entity === 'upamanyu' && inv.shareType
                            ? SHARE_TYPE_NAMES[inv.shareType as keyof typeof SHARE_TYPE_NAMES] || inv.shareType
                            : inv.interestRate
                            ? `${inv.interestRate}% interest`
                            : '—'}
                          {inv.numberOfShares && (
                            <p className="text-xs text-gray-400">{inv.numberOfShares} shares</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{formatDate(inv.startDate)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{formatDate(inv.endDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            STATUS_COLORS[inv.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'
                          }`}>
                            {STATUS_LABELS[inv.status as keyof typeof STATUS_LABELS] || inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {inv.certificateNumber?.replace('CERT-', '').substring(0, 12) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b z-10">
              <h2 className="text-lg font-bold text-gray-900">Add New Investment</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Entity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Entity *</label>
                <div className="grid grid-cols-2 gap-3">
                  {([ENTITIES.SWAR_SAKSHI, ENTITIES.UPAMANYU] as const).map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setField('entity', e); setField('shareType', ''); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.entity === e
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-900">
                        {e === ENTITIES.SWAR_SAKSHI ? 'Swar Sakshi' : 'Upamanyu'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {e === ENTITIES.SWAR_SAKSHI ? '12% fixed interest' : 'Equity & Preference shares'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Type (Upamanyu only) */}
              {form.entity === ENTITIES.UPAMANYU && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Share Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([SHARE_TYPES.EQUITY, SHARE_TYPES.PREFERENCE] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setField('shareType', st)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.shareType === st
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-sm text-gray-900">{SHARE_TYPE_NAMES[st]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Investor Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Investor Name" value={form.name} onChange={(v) => setField('name', v)} placeholder="Full name" />
                <Field label="Phone" value={form.phone} onChange={(v) => setField('phone', v)} placeholder="+91 XXXXX XXXXX" />
              </div>

              {/* Amount */}
              <Field
                label="Investment Amount (₹) *"
                value={form.amount}
                onChange={(v) => setField('amount', v)}
                placeholder="e.g. 50000"
                type="number"
              />

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start Date *" value={form.startDate} onChange={(v) => setField('startDate', v)} type="date" />
                <Field label="End Date (Maturity) *" value={form.endDate} onChange={(v) => setField('endDate', v)} type="date" />
              </div>

              {/* Swar Sakshi fields */}
              {form.entity === ENTITIES.SWAR_SAKSHI && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Interest Rate (%)"
                    value={form.interestRate}
                    onChange={(v) => setField('interestRate', v)}
                    placeholder="12"
                    type="number"
                  />
                  <Field
                    label="Dividend Rate (%)"
                    value={form.dividendRate}
                    onChange={(v) => setField('dividendRate', v)}
                    placeholder="Optional"
                    type="number"
                  />
                </div>
              )}

              {/* Upamanyu fields */}
              {form.entity === ENTITIES.UPAMANYU && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Number of Shares"
                    value={form.numberOfShares}
                    onChange={(v) => setField('numberOfShares', v)}
                    placeholder="e.g. 110"
                    type="number"
                  />
                  <Field
                    label="Share Price (₹)"
                    value={form.sharePrice}
                    onChange={(v) => setField('sharePrice', v)}
                    placeholder="e.g. 10"
                    type="number"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.compound}
                    onChange={(e) => setField('compound', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Compound Interest</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOldInvestment}
                    onChange={(e) => setField('isOldInvestment', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Old Investment (skip verification payment)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.earlyRefundAllowed}
                    onChange={(e) => setField('earlyRefundAllowed', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Early Refund Allowed</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Submit Message */}
              {submitMsg && (
                <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
                  submitMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {submitMsg.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  {submitMsg.text}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium"
              >
                {submitting ? 'Saving...' : 'Save Investment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: 'indigo' | 'green' | 'orange' | 'red';
}) {
  const colors = {
    indigo: 'border-t-indigo-500 text-indigo-600 bg-indigo-50',
    green: 'border-t-green-500 text-green-600 bg-green-50',
    orange: 'border-t-orange-500 text-orange-600 bg-orange-50',
    red: 'border-t-red-500 text-red-600 bg-red-50',
  };
  const iconColors = {
    indigo: 'text-indigo-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
  };
  return (
    <div className={`bg-white rounded-xl border-t-4 border border-gray-100 shadow-sm p-5 ${colors[color].split(' ')[0]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${iconColors[color]}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colors[color].split(' ').slice(1).join(' ')}`}>
          <Icon className={`h-5 w-5 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}
