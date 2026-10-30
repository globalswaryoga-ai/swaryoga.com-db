/**
 * CRM - Investment Rules & Legacy Import
 * - Edit dividend / late-interest rules per scheme (changes auto-apply to all investors)
 * - Create new rules (periodic dividend plans)
 * - Import old investors with their 6-month dividend history
 * - Mark dividend cycles as paid
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Frequency = 'monthly' | 'daily' | 'annually';

interface Scheme {
  id: string;
  name: string;
  description: string;
  tenureYears: number;
  payoutType: string;
  payoutIntervalMonths: number;
  minInvestment: number;
  annualDividendRatePct: number;
  lateCompoundRatePct: number;
  lateCompoundingFrequency: Frequency;
  graceDays: number;
}

interface Cycle {
  id: string;
  cycleNumber: number;
  dueDate: string;
  baseDividendAmount: number;
  status: string;
  paidDate?: string;
  paidAmount?: number;
  isOverdue: boolean;
  daysOverdue: number;
  accruedCompoundInterest: number;
  totalDueToday: number;
}

interface Investor {
  id: string;
  certificateNumber: string;
  schemeId: string;
  schemeName: string;
  investorName: string;
  phone: string;
  totalInvestmentAmount: number;
  amountPaid: number;
  startDate: string;
  endDate: string;
  payoutType: string;
  dividends?: Cycle[];
}

const EMPTY_NEW_SCHEME = {
  name: '',
  description: '',
  tenureYears: '3',
  payoutIntervalMonths: '6',
  minInvestment: '10000',
  annualDividendRatePct: '12',
  lateCompoundRatePct: '12',
  lateCompoundingFrequency: 'monthly' as Frequency,
  graceDays: '0',
};

const EMPTY_LEGACY = {
  schemeId: '',
  investorName: '',
  phone: '',
  email: '',
  city: '',
  startDate: '',
  totalInvestmentAmount: '',
  amountPaid: '',
  certificateNumber: '',
  pastPaidCycles: '',
};

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none';
const labelClass = 'block text-xs font-semibold text-gray-600 mb-1';

const money = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function InvestmentRulesPage() {
  const token = useAuth();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newScheme, setNewScheme] = useState(EMPTY_NEW_SCHEME);
  const [legacy, setLegacy] = useState(EMPTY_LEGACY);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const periodicSchemes = schemes.filter((s) => s.payoutType === 'periodic_dividend');

  const flash = (msg: string) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [schemeRes, invRes] = await Promise.all([
        fetch('/api/admin/crm/investment/schemes', { headers: authHeaders }),
        fetch('/api/admin/crm/investment?limit=500', { headers: authHeaders }),
      ]);
      const schemeJson = await schemeRes.json();
      const invJson = await invRes.json();
      if (!schemeRes.ok) throw new Error(schemeJson.error || 'Failed to load rules');
      setSchemes(schemeJson.data || []);
      if (invRes.ok) {
        setInvestors((invJson.data?.investments || []).filter((i: Investor) => i.payoutType === 'periodic_dividend'));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/crm/investment/schemes', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  };

  const saveScheme = async (scheme: Scheme, updates: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/crm/investment/schemes', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ schemeId: scheme.id, updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      flash(json.message);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const createScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const json = await post({ action: 'create_scheme', ...newScheme });
      flash(json.message);
      setNewScheme(EMPTY_NEW_SCHEME);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const importLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cycles = legacy.pastPaidCycles
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map(Number);
      const json = await post({
        action: 'add_legacy_investor',
        schemeId: legacy.schemeId || periodicSchemes[0]?.id,
        investorName: legacy.investorName,
        phone: legacy.phone,
        email: legacy.email,
        city: legacy.city,
        startDate: legacy.startDate,
        totalInvestmentAmount: legacy.totalInvestmentAmount,
        amountPaid: legacy.amountPaid,
        certificateNumber: legacy.certificateNumber,
        pastDividendsPaidCycles: cycles,
      });
      flash(json.message);
      setLegacy(EMPTY_LEGACY);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markPaid = async (cycle: Cycle) => {
    const txn = window.prompt(`Transaction ID for cycle ${cycle.cycleNumber} (leave blank to auto-generate)`) ?? null;
    if (txn === null) return;
    try {
      const json = await post({
        action: 'mark_dividend_paid',
        dividendId: cycle.id,
        paidAmount: cycle.totalDueToday,
        paidTxnId: txn.trim() || undefined,
      });
      flash(json.message);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ Investment Rules & Legacy Import</h1>
            <p className="text-gray-600 text-sm mt-1">
              Every rate below is live. Change it here and all investors on that rule update automatically.
            </p>
          </div>
          <a href="/admin/crm/investment" className="text-sm text-green-700 hover:underline">← Back to investments</a>
        </div>

        {message && <div className="p-3 rounded-lg bg-green-50 text-green-800 border border-green-200">{message}</div>}
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">{error}</div>}
        {loading && <div className="text-gray-500">Loading…</div>}

        {/* ===== RULES ===== */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Rules (Schemes)</h2>
          {periodicSchemes.length === 0 && !loading && (
            <div className="p-4 bg-white rounded-xl border text-gray-500 text-sm">No dividend rules yet. Create one below.</div>
          )}
          {periodicSchemes.map((s) => (
            <SchemeEditor key={s.id} scheme={s} onSave={(u) => saveScheme(s, u)} />
          ))}

          <form onSubmit={createScheme} className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">+ Create a new rule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Rule name *">
                <input required className={inputClass} value={newScheme.name} onChange={(e) => setNewScheme({ ...newScheme, name: e.target.value })} />
              </Field>
              <Field label="Tenure (years) *">
                <input required type="number" min={1} className={inputClass} value={newScheme.tenureYears} onChange={(e) => setNewScheme({ ...newScheme, tenureYears: e.target.value })} />
              </Field>
              <Field label="Payout every (months) *">
                <input required type="number" min={1} className={inputClass} value={newScheme.payoutIntervalMonths} onChange={(e) => setNewScheme({ ...newScheme, payoutIntervalMonths: e.target.value })} />
              </Field>
              <Field label="Dividend rate % p.a. *">
                <input required type="number" step="0.01" className={inputClass} value={newScheme.annualDividendRatePct} onChange={(e) => setNewScheme({ ...newScheme, annualDividendRatePct: e.target.value })} />
              </Field>
              <Field label="Late compound rate % p.a. *">
                <input required type="number" step="0.01" className={inputClass} value={newScheme.lateCompoundRatePct} onChange={(e) => setNewScheme({ ...newScheme, lateCompoundRatePct: e.target.value })} />
              </Field>
              <Field label="Minimum investment (₹)">
                <input type="number" className={inputClass} value={newScheme.minInvestment} onChange={(e) => setNewScheme({ ...newScheme, minInvestment: e.target.value })} />
              </Field>
              <FrequencyField value={newScheme.lateCompoundingFrequency} onChange={(v) => setNewScheme({ ...newScheme, lateCompoundingFrequency: v })} />
              <Field label="Grace days before late interest">
                <input type="number" min={0} className={inputClass} value={newScheme.graceDays} onChange={(e) => setNewScheme({ ...newScheme, graceDays: e.target.value })} />
              </Field>
              <Field label="Description">
                <input className={inputClass} value={newScheme.description} onChange={(e) => setNewScheme({ ...newScheme, description: e.target.value })} />
              </Field>
            </div>
            <button type="submit" className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold">Create rule</button>
          </form>
        </section>

        {/* ===== LEGACY IMPORT ===== */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Import Old Investor</h2>
          <form onSubmit={importLegacy} className="bg-white rounded-xl border p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Rule">
                <select className={inputClass} value={legacy.schemeId || periodicSchemes[0]?.id || ''} onChange={(e) => setLegacy({ ...legacy, schemeId: e.target.value })}>
                  {periodicSchemes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Investor name *">
                <input required className={inputClass} value={legacy.investorName} onChange={(e) => setLegacy({ ...legacy, investorName: e.target.value })} />
              </Field>
              <Field label="Phone *">
                <input required className={inputClass} value={legacy.phone} onChange={(e) => setLegacy({ ...legacy, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={legacy.email} onChange={(e) => setLegacy({ ...legacy, email: e.target.value })} />
              </Field>
              <Field label="City">
                <input className={inputClass} value={legacy.city} onChange={(e) => setLegacy({ ...legacy, city: e.target.value })} />
              </Field>
              <Field label="Start date *">
                <input required type="date" className={inputClass} value={legacy.startDate} onChange={(e) => setLegacy({ ...legacy, startDate: e.target.value })} />
              </Field>
              <Field label="Invested amount (₹) *">
                <input required type="number" min={1} className={inputClass} value={legacy.totalInvestmentAmount} onChange={(e) => setLegacy({ ...legacy, totalInvestmentAmount: e.target.value })} />
              </Field>
              <Field label="Amount actually paid (₹)">
                <input type="number" min={0} className={inputClass} value={legacy.amountPaid} onChange={(e) => setLegacy({ ...legacy, amountPaid: e.target.value })} />
              </Field>
              <Field label="Certificate no. (optional)">
                <input className={inputClass} value={legacy.certificateNumber} onChange={(e) => setLegacy({ ...legacy, certificateNumber: e.target.value })} />
              </Field>
              <Field label="Cycles already paid (e.g. 1,2,3)">
                <input className={inputClass} value={legacy.pastPaidCycles} onChange={(e) => setLegacy({ ...legacy, pastPaidCycles: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-gray-500">
              Unpaid cycles whose due date has passed will show as overdue and accrue late interest using the rule's current settings.
            </p>
            <button type="submit" disabled={periodicSchemes.length === 0} className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold">
              Import investor
            </button>
          </form>
        </section>

        {/* ===== INVESTORS & CYCLES ===== */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Investors & Dividend Cycles</h2>
          {investors.length === 0 && !loading && <div className="p-4 bg-white rounded-xl border text-gray-500 text-sm">No dividend investors yet.</div>}
          {investors.map((inv) => {
            const open = expandedId === inv.id;
            const cycles = inv.dividends || [];
            const overdueCount = cycles.filter((c) => c.isOverdue && c.status !== 'paid').length;
            return (
              <div key={inv.id} className="bg-white rounded-xl border">
                <button type="button" onClick={() => setExpandedId(open ? null : inv.id)} className="w-full flex items-center justify-between p-4 text-left">
                  <div>
                    <div className="font-semibold text-gray-900">{inv.investorName} <span className="text-xs text-gray-500">· {inv.certificateNumber}</span></div>
                    <div className="text-xs text-gray-500">{inv.schemeName} · {inv.phone} · Invested {money(inv.totalInvestmentAmount)}</div>
                  </div>
                  <div className="text-sm">
                    {overdueCount > 0 ? <span className="text-red-600 font-semibold">{overdueCount} overdue</span> : <span className="text-green-700">Up to date</span>}
                  </div>
                </button>
                {open && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left p-2">Cycle</th>
                          <th className="text-left p-2">Due</th>
                          <th className="text-right p-2">Dividend</th>
                          <th className="text-right p-2">Days late</th>
                          <th className="text-right p-2">Late interest</th>
                          <th className="text-right p-2">Due today</th>
                          <th className="text-left p-2">Status</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cycles.map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="p-2">{c.cycleNumber}</td>
                            <td className="p-2">{c.dueDate}</td>
                            <td className="p-2 text-right">{money(c.baseDividendAmount)}</td>
                            <td className="p-2 text-right">{c.status === 'paid' ? '-' : c.daysOverdue}</td>
                            <td className="p-2 text-right">{c.status === 'paid' ? '-' : money(c.accruedCompoundInterest)}</td>
                            <td className="p-2 text-right font-semibold">{c.status === 'paid' ? money(c.paidAmount || 0) : money(c.totalDueToday)}</td>
                            <td className="p-2">
                              <span className={c.status === 'paid' ? 'text-green-700' : c.isOverdue ? 'text-red-600' : 'text-gray-600'}>
                                {c.status === 'paid' ? `Paid ${c.paidDate || ''}` : c.isOverdue ? 'Overdue' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {c.status !== 'paid' && (
                                <button type="button" onClick={() => markPaid(c)} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs">Mark paid</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function FrequencyField({ value, onChange }: { value: Frequency; onChange: (v: Frequency) => void }) {
  return (
    <Field label="Late interest compounds">
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as Frequency)}>
        <option value="monthly">Monthly</option>
        <option value="daily">Daily</option>
        <option value="annually">Annually</option>
      </select>
    </Field>
  );
}

function SchemeEditor({ scheme, onSave }: { scheme: Scheme; onSave: (updates: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    name: scheme.name,
    description: scheme.description,
    annualDividendRatePct: String(scheme.annualDividendRatePct),
    lateCompoundRatePct: String(scheme.lateCompoundRatePct),
    lateCompoundingFrequency: scheme.lateCompoundingFrequency,
    graceDays: String(scheme.graceDays),
    minInvestment: String(scheme.minInvestment),
  });

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold text-gray-900">{scheme.name}</div>
          <div className="text-xs text-gray-500">
            {scheme.tenureYears} years · payout every {scheme.payoutIntervalMonths} months · tenure and payout interval are fixed once created
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSave({
            name: form.name,
            description: form.description,
            annualDividendRatePct: form.annualDividendRatePct,
            lateCompoundRatePct: form.lateCompoundRatePct,
            lateCompoundingFrequency: form.lateCompoundingFrequency,
            graceDays: form.graceDays,
            minInvestment: form.minInvestment,
          })}
          className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Save rule
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Dividend rate % p.a.">
          <input type="number" step="0.01" className={inputClass} value={form.annualDividendRatePct} onChange={(e) => setForm({ ...form, annualDividendRatePct: e.target.value })} />
        </Field>
        <Field label="Late compound rate % p.a.">
          <input type="number" step="0.01" className={inputClass} value={form.lateCompoundRatePct} onChange={(e) => setForm({ ...form, lateCompoundRatePct: e.target.value })} />
        </Field>
        <FrequencyField value={form.lateCompoundingFrequency} onChange={(v) => setForm({ ...form, lateCompoundingFrequency: v })} />
        <Field label="Grace days before late interest">
          <input type="number" min={0} className={inputClass} value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: e.target.value })} />
        </Field>
        <Field label="Minimum investment (₹)">
          <input type="number" className={inputClass} value={form.minInvestment} onChange={(e) => setForm({ ...form, minInvestment: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
