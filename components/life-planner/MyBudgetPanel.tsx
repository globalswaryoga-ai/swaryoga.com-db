'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Save, RefreshCw, AlertTriangle, FileText } from 'lucide-react';

type BudgetAllocation = {
  key: string;
  label: string;
  percent: number;
  kind: 'expense' | 'profit';
};

type BudgetPlan = {
  year: number;
  currency: string;
  incomeTargetYearly: number;
  incomeTargetMonthly: number;
  incomeTargetWeekly: number;
  allocations: BudgetAllocation[];
  notes?: string;
};

type BudgetReport = {
  year: number;
  range: { startDate: string; endDate: string };
  currency: string;
  baseMode: 'actual' | 'target';
  baseIncome: number;
  totals: { income: number; outflow: number; profit: number };
  buckets: Array<{
    key: string;
    label: string;
    kind: 'expense' | 'profit';
    percent: number;
    budgetAmount: number;
    actualAmount: number;
    varianceAmount: number;
    variancePercent: number;
  }>;
  meta: { transactionsCount: number; generatedAt: string };
};

const normalize = (s: string) => s.trim();

const sumPercent = (allocations: BudgetAllocation[]) =>
  allocations.reduce((s, a) => s + (Number.isFinite(a.percent) ? a.percent : 0), 0);

const todayISO = () => new Date().toISOString().split('T')[0];

const defaultRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

export default function MyBudgetPanel({ hideTitle = false }: { hideTitle?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plan, setPlan] = useState<BudgetPlan | null>(null);

  const [range, setRange] = useState<{ startDate: string; endDate: string }>(defaultRange());
  const [baseMode, setBaseMode] = useState<'actual' | 'target'>('actual');

  const [report, setReport] = useState<BudgetReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string>('');

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('lifePlannerToken') : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadPlan = useCallback(async () => {
    setLoadingPlan(true);
    try {
      const res = await fetch(`/api/accounting/budget?year=${year}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load budget plan');
      setPlan(json.data);
    } catch (e: any) {
      console.error(e);
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }, [getAuthHeaders, year]);

  const savePlan = useCallback(async () => {
    if (!plan) return;
    setSavingPlan(true);
    try {
      const res = await fetch('/api/accounting/budget', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...plan, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save budget plan');
      setPlan(json.data);
      alert('Budget saved');
    } catch (e: any) {
      alert(e?.message || 'Failed to save');
    } finally {
      setSavingPlan(false);
    }
  }, [getAuthHeaders, plan, year]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    setReportError('');
    try {
      const res = await fetch('/api/accounting/budget/report', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          startDate: range.startDate,
          endDate: range.endDate,
          baseMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate report');
      setReport(json.data);
    } catch (e: any) {
      setReport(null);
      setReportError(e?.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  }, [baseMode, getAuthHeaders, range.endDate, range.startDate, year]);

  const downloadHtml = useCallback(
    async (downloadType: 'budget' | 'reality' | 'variance' | 'guide') => {
      try {
        const res = await fetch('/api/accounting/budget/download', {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            downloadType,
            year,
            startDate: range.startDate,
            endDate: range.endDate,
            baseMode,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || 'Download failed');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // filename comes from Content-Disposition, but Safari sometimes ignores it.
        link.download = `${downloadType}-${year}.html`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (e: any) {
        alert(e?.message || 'Download failed');
      }
    },
    [baseMode, getAuthHeaders, range.endDate, range.startDate, year]
  );

  const allocationTotal = useMemo(() => (plan ? sumPercent(plan.allocations) : 0), [plan]);
  const allocationTotalOk = Math.abs(allocationTotal - 100) <= 0.01;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadPlan();
  }, [loadPlan, mounted]);

  // auto-refresh report when range changes (only if report already loaded once)
  useEffect(() => {
    if (!mounted) return;
    if (!report) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMode, range.startDate, range.endDate, year]);

  if (!mounted) return null;

  return (
    <>
      {!hideTitle ? (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-swar-text">My Budget</h1>
          <p className="text-swar-text-secondary">Set targets, allocate 100%, and compare budget vs reality</p>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-swar-text-secondary">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 p-2 border border-swar-border rounded-lg"
            />
          </div>

          <button
            onClick={loadPlan}
            className="inline-flex items-center gap-2 rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
            disabled={loadingPlan}
            title="Reload plan"
          >
            <RefreshCw className={`h-4 w-4 ${loadingPlan ? 'animate-spin' : ''}`} />
            Reload
          </button>

          <button
            onClick={savePlan}
            className="inline-flex items-center gap-2 rounded-lg bg-swar-primary hover:bg-swar-primary-hover text-white px-4 py-2 text-sm font-semibold"
            disabled={savingPlan || !plan}
          >
            <Save className="h-4 w-4" />
            {savingPlan ? 'Saving…' : 'Save Budget'}
          </button>
        </div>

        {!allocationTotalOk ? (
          <div className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            Allocation total is {allocationTotal.toFixed(2)}% (must be 100%)
          </div>
        ) : null}
      </div>

      {/* Targets */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-swar-text">Income Targets</h2>

        {loadingPlan ? (
          <div className="text-swar-text-secondary mt-3">Loading…</div>
        ) : !plan ? (
          <div className="text-red-600 mt-3">Failed to load plan (please login again).</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-1">Yearly income target</label>
              <input
                type="number"
                value={plan.incomeTargetYearly}
                onChange={(e) => setPlan({ ...plan, incomeTargetYearly: Number(e.target.value) })}
                className="w-full p-3 border border-swar-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-1">Monthly income target</label>
              <input
                type="number"
                value={plan.incomeTargetMonthly}
                onChange={(e) => setPlan({ ...plan, incomeTargetMonthly: Number(e.target.value) })}
                className="w-full p-3 border border-swar-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-1">Weekly income target</label>
              <input
                type="number"
                value={plan.incomeTargetWeekly}
                onChange={(e) => setPlan({ ...plan, incomeTargetWeekly: Number(e.target.value) })}
                className="w-full p-3 border border-swar-border rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Allocation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-swar-text">Expense + Profit Allocation (100%)</h2>
          <div className="text-sm text-swar-text-secondary">Tip: use the same category names while adding transactions.</div>
        </div>

        {!plan ? null : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-swar-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Bucket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Percent</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plan.allocations.map((a, idx) => (
                  <tr key={`${a.key}-${idx}`}>
                    <td className="px-4 py-3">
                      <input
                        value={a.label}
                        onChange={(e) => {
                          const next = [...plan.allocations];
                          next[idx] = { ...a, label: normalize(e.target.value) };
                          setPlan({ ...plan, allocations: next });
                        }}
                        className="w-full p-2 border border-swar-border rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={a.key}
                        onChange={(e) => {
                          const next = [...plan.allocations];
                          next[idx] = { ...a, key: normalize(e.target.value) };
                          setPlan({ ...plan, allocations: next });
                        }}
                        className="w-full p-2 border border-swar-border rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.kind}
                        onChange={(e) => {
                          const next = [...plan.allocations];
                          next[idx] = { ...a, kind: e.target.value === 'profit' ? 'profit' : 'expense' };
                          setPlan({ ...plan, allocations: next });
                        }}
                        className="w-full p-2 border border-swar-border rounded-lg"
                      >
                        <option value="expense">Expense</option>
                        <option value="profit">Profit</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={a.percent}
                        onChange={(e) => {
                          const next = [...plan.allocations];
                          next[idx] = { ...a, percent: Number(e.target.value) };
                          setPlan({ ...plan, allocations: next });
                        }}
                        className="w-28 p-2 border border-swar-border rounded-lg text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-3 font-semibold" colSpan={3}>
                    Total
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${allocationTotalOk ? 'text-swar-primary' : 'text-red-600'}`}
                  >
                    {allocationTotal.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {!plan ? null : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-swar-text mb-1">Notes</label>
            <textarea
              value={plan.notes || ''}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              className="w-full p-3 border border-swar-border rounded-lg"
              rows={3}
              placeholder="Write your rules (example: Profit target %, savings rules, etc.)"
            />
          </div>
        )}
      </div>

      {/* Compare */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-swar-text">Reality vs Budget (Error Report)</h2>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-swar-text-secondary">Start</label>
              <input
                type="date"
                value={range.startDate}
                onChange={(e) => setRange({ ...range, startDate: e.target.value || todayISO() })}
                className="p-2 border border-swar-border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-swar-text-secondary">End</label>
              <input
                type="date"
                value={range.endDate}
                onChange={(e) => setRange({ ...range, endDate: e.target.value || todayISO() })}
                className="p-2 border border-swar-border rounded-lg"
              />
            </div>
            <select
              value={baseMode}
              onChange={(e) => setBaseMode(e.target.value === 'target' ? 'target' : 'actual')}
              className="p-2 border border-swar-border rounded-lg"
              title="Budget base income"
            >
              <option value="actual">Base = Actual Income</option>
              <option value="target">Base = Target Income</option>
            </select>
            <button
              onClick={loadReport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold"
              disabled={loadingReport}
            >
              <FileText className="h-4 w-4" />
              {loadingReport ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>

        {reportError ? <div className="mt-4 text-red-600">{reportError}</div> : null}

        {report ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-swar-border bg-swar-bg">
                <p className="text-sm text-swar-text-secondary">Income</p>
                <p className="text-xl font-bold">₹{Math.round(report.totals.income).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg border border-swar-border bg-swar-bg">
                <p className="text-sm text-swar-text-secondary">Outflow</p>
                <p className="text-xl font-bold">₹{Math.round(report.totals.outflow).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg border border-swar-border bg-swar-bg">
                <p className="text-sm text-swar-text-secondary">Profit</p>
                <p className={`text-xl font-bold ${report.totals.profit >= 0 ? 'text-swar-primary' : 'text-red-600'}`}>
                  ₹{Math.round(report.totals.profit).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-swar-border bg-swar-bg">
                <p className="text-sm text-swar-text-secondary">Profit Ratio</p>
                <p className="text-xl font-bold">
                  {report.totals.income > 0 ? ((report.totals.profit / report.totals.income) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-swar-bg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Bucket</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Budget %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Budget Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Variance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.buckets.map((b) => {
                    const bad = b.kind === 'profit' ? b.actualAmount < b.budgetAmount : b.actualAmount > b.budgetAmount;
                    return (
                      <tr key={b.key}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-swar-text">{b.label}</div>
                          <div className="text-xs text-swar-text-secondary">
                            {b.kind === 'profit' ? 'Profit' : 'Category outflow'} • key: {b.key}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{Number.isFinite(b.percent) ? b.percent.toFixed(2) : '0.00'}%</td>
                        <td className="px-4 py-3 text-right">₹{Math.round(b.budgetAmount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">₹{Math.round(b.actualAmount).toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${bad ? 'text-red-600' : 'text-swar-primary'}`}>
                          {b.varianceAmount >= 0 ? '+' : ''}₹{Math.round(b.varianceAmount).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => downloadHtml('budget')}
                className="inline-flex items-center gap-2 rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Download Budget
              </button>
              <button
                onClick={() => downloadHtml('reality')}
                className="inline-flex items-center gap-2 rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Download Reality
              </button>
              <button
                onClick={() => downloadHtml('variance')}
                className="inline-flex items-center gap-2 rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Download Error Report
              </button>
              <button
                onClick={() => downloadHtml('guide')}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold"
              >
                <FileText className="h-4 w-4" /> Download Guide
              </button>
            </div>

            <p className="mt-3 text-xs text-swar-text-secondary">
              Downloads are HTML files (open/print as PDF). Range: {report.range.startDate} → {report.range.endDate}. Transactions counted:{' '}
              {report.meta.transactionsCount}.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-swar-text-secondary">Generate report to see budget vs reality.</p>
        )}
      </div>
    </>
  );
}
