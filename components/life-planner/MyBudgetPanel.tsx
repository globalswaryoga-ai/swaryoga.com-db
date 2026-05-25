/**
 * @fileoverview Life Planner Budget Planning Component
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

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

type RecurrenceType = 'none' | 'monthly' | 'custom' | 'yearly';

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
  const [savingExpenses, setSavingExpenses] = useState(false);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plan, setPlan] = useState<BudgetPlan | null>(null);

  const [range, setRange] = useState<{ startDate: string; endDate: string }>(defaultRange());
  const [baseMode, setBaseMode] = useState<'actual' | 'target'>('actual');

  const [report, setReport] = useState<BudgetReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string>('');
  
  // Dropdown state for allocation section
  const [showAllocations, setShowAllocations] = useState(false);
  
  // Expense budget state
  const [expenseBudgets, setExpenseBudgets] = useState<Array<{
    id: string;
    month: string;
    particular: string;
    accountHead: string;
    type: 'income' | 'expense';
    amount: number;
    reality: number;
    recurrence?: RecurrenceType;
    customInterval?: number;
  }>>([]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('crm_token') ||
        localStorage.getItem('lifePlannerToken') ||
        localStorage.getItem('token')
      : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;
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

  const loadExpenseBudgets = useCallback(async () => {
    try {
      const res = await fetch('/api/crm-planner/data?type=expense_budgets', {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.data && Array.isArray(json.data)) {
        setExpenseBudgets(json.data);
      }
    } catch (e: any) {
      console.error('Failed to load expense budgets:', e);
    }
  }, [getAuthHeaders]);

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

  // Generate repeating entries from an entry with recurrence set
  const generateRepeatingEntries = useCallback((sourceEntry: typeof expenseBudgets[0], totalMonths: number = 12) => {
    const interval = sourceEntry.recurrence === 'monthly' ? 1
      : sourceEntry.recurrence === 'yearly' ? 12
      : (sourceEntry.customInterval || 1);

    const [baseYear, baseMonth] = sourceEntry.month.split('-').map(Number);
    const newEntries: typeof expenseBudgets = [];

    for (let i = interval; i <= totalMonths; i += interval) {
      const d = new Date(baseYear, baseMonth - 1 + i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // Skip if already exists for same particular + month
      const alreadyExists = expenseBudgets.some(
        e => e.month === monthStr && e.particular === sourceEntry.particular && e.accountHead === sourceEntry.accountHead
      );
      if (!alreadyExists) {
        newEntries.push({
          ...sourceEntry,
          id: `exp-${Date.now()}-${i}`,
          month: monthStr,
          reality: 0,
        });
      }
    }
    return newEntries;
  }, [expenseBudgets]);

  // Auto-load actual spending from accounting transactions and fill reality
  const autoMatchReality = useCallback(async () => {
    try {
      const res = await fetch('/api/crm-planner/data?type=accounting', { headers: getAuthHeaders() });
      const json = await res.json();
      const transactions: any[] = json?.data?.transactions || [];

      const updated = expenseBudgets.map(entry => {
        const [yr, mo] = entry.month.split('-').map(Number);
        const monthStart = new Date(yr, mo - 1, 1);
        const monthEnd = new Date(yr, mo, 0);

        // Sum matching transactions in that month
        // Income entries: only earned income (type=income), never loans
        // Expense entries: regular expenses + EMI repayments (but not loan receipts)
        const matched = transactions.filter(t => {
          const d = new Date(t.date);
          const sameMonth = d >= monthStart && d <= monthEnd;
          const sameType = entry.type === 'income'
            ? t.type === 'income'                        // only earned income — loans excluded
            : (t.type === 'expense' || t.type === 'emi'); // expense + loan repayments
          const sameHead = entry.accountHead
            ? t.category?.toLowerCase().includes(entry.accountHead.toLowerCase()) ||
              t.description?.toLowerCase().includes(entry.accountHead.toLowerCase()) ||
              entry.accountHead.toLowerCase().includes(t.category?.toLowerCase() || '')
            : true;
          return sameMonth && sameType && sameHead;
        });

        const reality = matched.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        return { ...entry, reality: Math.round(reality) };
      });

      setExpenseBudgets(updated);
      alert('Reality figures updated from actual transactions!');
    } catch (e: any) {
      alert('Failed to load transactions: ' + e.message);
    }
  }, [expenseBudgets, getAuthHeaders]);

  const saveExpenseBudgets = useCallback(async () => {
    setSavingExpenses(true);
    try {
      const res = await fetch('/api/crm-planner/data', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense_budgets',
          data: expenseBudgets,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save expense budgets');
      alert('Expense budgets saved successfully');
    } catch (e: any) {
      alert(e?.message || 'Failed to save expense budgets');
    } finally {
      setSavingExpenses(false);
    }
  }, [expenseBudgets, getAuthHeaders]);

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

  // Real transactions for matching
  const [realTransactions, setRealTransactions] = useState<any[]>([]);

  const loadRealTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/crm-planner/data?type=accounting', { headers: getAuthHeaders() });
      const json = await res.json();
      setRealTransactions(json?.data?.transactions || []);
    } catch { setRealTransactions([]); }
  }, [getAuthHeaders]);

  // Smart category matcher: maps alloc key/label to transaction categories
  const matchesAlloc = useCallback((alloc: BudgetAllocation, category: string, description: string): boolean => {
    const cat = (category || '').toLowerCase().trim();
    const desc = (description || '').toLowerCase().trim();
    const key = (alloc.key || '').toLowerCase().trim();
    const label = (alloc.label || '').toLowerCase().trim();

    // Exact match first
    if (cat === key || cat === label) return true;

    // Partial match: key/label contains category word or vice versa
    const catWords = cat.split(/[\s_\-\/,]+/).filter(Boolean);
    const keyWords = [...key.split(/[\s_\-\/,]+/), ...label.split(/[\s_\-\/,]+/)].filter(Boolean);

    for (const kw of keyWords) {
      if (kw.length < 3) continue;
      if (cat.includes(kw) || desc.includes(kw)) return true;
    }
    for (const cw of catWords) {
      if (cw.length < 3) continue;
      if (key.includes(cw) || label.includes(cw)) return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadPlan();
    loadExpenseBudgets();
    loadRealTransactions();
  }, [loadPlan, loadExpenseBudgets, loadRealTransactions, mounted]);

  // Auto-refresh transactions when year changes
  useEffect(() => {
    if (!mounted) return;
    loadRealTransactions();
  }, [year, mounted, loadRealTransactions]);

  // auto-load report when plan loads successfully
  useEffect(() => {
    if (!mounted || !plan) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.year, mounted]);

  // auto-refresh report when range/mode changes
  useEffect(() => {
    if (!mounted) return;
    if (!report) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMode, range.startDate, range.endDate, year]);

  // Calculate dashboard statistics — works without report
  const dashboardStats = useMemo(() => {
    if (!plan) return { totalIncome: 0, totalExpenses: 0, netProfit: 0, budgetUtilization: 0, realIncome: 0, realExpenses: 0 };

    const totalIncome = plan.incomeTargetYearly || 0;
    const expenseAllocations = plan.allocations?.filter(a => a.kind === 'expense') || [];
    const totalExpensePercent = sumPercent(expenseAllocations);
    const totalExpenses = (totalExpensePercent / 100) * totalIncome;
    const profitAllocations = plan.allocations?.filter(a => a.kind === 'profit') || [];
    const totalProfitPercent = sumPercent(profitAllocations);
    const totalProfit = (totalProfitPercent / 100) * totalIncome;

    // Real figures from actual transactions (current year)
    // Loans received are NOT income — only count earned income (type='income')
    // Expenses include regular expenses + loan repayments (EMI), but NOT loan receipts
    const yearTxns = realTransactions.filter(t => new Date(t.date).getFullYear() === (plan.year || year));
    const realIncome = yearTxns.filter(t => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const realExpenses = yearTxns.filter(t => t.type === 'expense' || t.type === 'emi').reduce((s: number, t: any) => s + (t.amount || 0), 0);

    // Budget utilization: real expenses vs budgeted expenses
    const actualTotalOutflow = report?.totals?.outflow || realExpenses;
    const budgetUtilization = totalExpenses > 0 ? Math.round((actualTotalOutflow / totalExpenses) * 100) : 0;

    return { totalIncome, totalExpenses, netProfit: totalProfit, budgetUtilization, realIncome, realExpenses };
  }, [plan, report, realTransactions, year]);

  if (!mounted) return null;

  return (
    <>
      {!hideTitle ? (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-swar-text">My Budget</h1>
          <p className="text-swar-text-secondary">Set targets, allocate 100%, and compare budget vs reality</p>
        </div>
      ) : null}

      {/* Dashboard - Summary Blocks */}
      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Income Block */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-5 border border-green-200">
            <p className="text-sm font-semibold text-green-700 mb-2">💰 Income</p>
            <p className="text-2xl font-bold text-green-900">₹{dashboardStats.totalIncome.toLocaleString('en-IN')}</p>
            <p className="text-xs text-green-700 mt-1">Target yearly</p>
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-xs text-green-600">Real (this year)</p>
              <p className={`text-lg font-bold ${dashboardStats.realIncome >= dashboardStats.totalIncome ? 'text-green-800' : 'text-orange-700'}`}>
                ₹{dashboardStats.realIncome.toLocaleString('en-IN')}
                <span className="text-xs ml-1">{dashboardStats.totalIncome > 0 ? `(${Math.round((dashboardStats.realIncome / dashboardStats.totalIncome) * 100)}%)` : ''}</span>
              </p>
            </div>
          </div>

          {/* Expenses Block */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-md p-5 border border-red-200">
            <p className="text-sm font-semibold text-red-700 mb-2">💸 Expenses</p>
            <p className="text-2xl font-bold text-red-900">₹{dashboardStats.totalExpenses.toLocaleString('en-IN')}</p>
            <p className="text-xs text-red-700 mt-1">Budget annual</p>
            <div className="mt-2 pt-2 border-t border-red-200">
              <p className="text-xs text-red-600">Real (this year)</p>
              <p className={`text-lg font-bold ${dashboardStats.realExpenses > dashboardStats.totalExpenses ? 'text-red-800' : 'text-green-700'}`}>
                ₹{dashboardStats.realExpenses.toLocaleString('en-IN')}
                {dashboardStats.realExpenses > dashboardStats.totalExpenses
                  ? <span className="text-xs ml-1 text-red-600">⚠ Over budget</span>
                  : <span className="text-xs ml-1 text-green-600">✓ Within budget</span>}
              </p>
            </div>
          </div>

          {/* Net Profit/Savings Block */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-5 border border-blue-200">
            <p className="text-sm font-semibold text-blue-700 mb-2">📈 Net Profit/Savings</p>
            <p className="text-2xl font-bold text-blue-900">₹{dashboardStats.netProfit.toLocaleString('en-IN')}</p>
            <p className="text-xs text-blue-700 mt-1">Target profit</p>
            <div className="mt-2 pt-2 border-t border-blue-200">
              <p className="text-xs text-blue-600">Real net (Income - Expense)</p>
              {(() => {
                const realNet = dashboardStats.realIncome - dashboardStats.realExpenses;
                return (
                  <p className={`text-lg font-bold ${realNet >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {realNet >= 0 ? '+' : ''}₹{realNet.toLocaleString('en-IN')}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Budget Utilization Block */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-5 border border-purple-200">
            <p className="text-sm font-semibold text-purple-700 mb-2">🎯 Budget Used</p>
            <p className={`text-2xl font-bold ${dashboardStats.budgetUtilization > 100 ? 'text-red-900' : dashboardStats.budgetUtilization > 80 ? 'text-orange-900' : 'text-purple-900'}`}>
              {dashboardStats.budgetUtilization}%
            </p>
            <p className="text-xs text-purple-700 mt-1">Of annual expense budget</p>
            <div className="mt-2 pt-2 border-t border-purple-200">
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${dashboardStats.budgetUtilization > 100 ? 'bg-red-500' : dashboardStats.budgetUtilization > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(dashboardStats.budgetUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setShowAllocations(!showAllocations)}
            className="flex items-center gap-2 text-lg font-semibold text-swar-text hover:text-swar-primary transition-colors"
          >
            <span>{showAllocations ? '▼' : '▶'}</span>
            Expense + Profit Allocation (100%)
          </button>
          {showAllocations && (
            <button
              onClick={() => {
                if (!plan) return;
                const newId = `alloc-${Date.now()}`;
                const next = [...plan.allocations, { key: newId, label: 'New Category', percent: 0, kind: 'expense' as const }];
                setPlan({ ...plan, allocations: next });
              }}
              className="px-4 py-2 bg-swar-primary hover:bg-swar-primary-hover text-white rounded-lg text-sm font-semibold"
            >
              + Add Allocation
            </button>
          )}
        </div>

        {showAllocations && !plan ? (
          <div className="text-swar-text-secondary mt-3">Loading…</div>
        ) : showAllocations && plan ? (
          <div className="mt-4 overflow-x-auto">
            {(() => {
              const yearlyIncome = plan.incomeTargetYearly || 0;
              const planYear = plan.year || year;
              // Pre-compute real yearly amount per allocation from actual transactions
              const getRealAmount = (alloc: BudgetAllocation): number => {
                return realTransactions
                  .filter((t: any) => {
                    const d = new Date(t.date);
                    if (d.getFullYear() !== planYear) return false;
                    const isRelevant = alloc.kind === 'expense'
                      ? (t.type === 'expense' || t.type === 'emi')
                      : t.type === 'income';  // profit allocs compare against income
                    return isRelevant && matchesAlloc(alloc, t.category || '', t.description || '');
                  })
                  .reduce((s: number, t: any) => s + (t.amount || 0), 0);
              };
              const totalRealExpenses = plan.allocations
                .filter(a => a.kind === 'expense')
                .reduce((s, a) => s + getRealAmount(a), 0);
              const totalBudgetExpenses = plan.allocations
                .filter(a => a.kind === 'expense')
                .reduce((s, a) => s + (a.percent / 100) * yearlyIncome, 0);

              return (
                <table className="w-full min-w-[800px]">
                  <thead className="bg-swar-bg">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Bucket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Key</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Percent</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-green-700 uppercase bg-green-50">
                        Budget Amt
                        <div className="text-[10px] font-normal text-green-500 normal-case">Yearly (auto)</div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-blue-700 uppercase bg-blue-50">
                        Real Amt
                        <div className="text-[10px] font-normal text-blue-500 normal-case">Actual (auto)</div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-swar-text-secondary uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plan.allocations.map((a, idx) => {
                      const budgetAmt = Math.round((a.percent / 100) * yearlyIncome);
                      const realAmt = Math.round(getRealAmount(a));
                      const diff = a.kind === 'expense' ? budgetAmt - realAmt : realAmt - budgetAmt;
                      const isOver = diff < 0;
                      return (
                        <tr key={`${a.key}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                          <td className="px-4 py-3">
                            <input
                              value={a.label}
                              onChange={(e) => {
                                const next = [...plan.allocations];
                                next[idx] = { ...a, label: normalize(e.target.value) };
                                setPlan({ ...plan, allocations: next });
                              }}
                              className="w-full p-2 border border-swar-border rounded-lg text-sm"
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
                              className="w-full p-2 border border-swar-border rounded-lg text-sm"
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
                              className="w-full p-2 border border-swar-border rounded-lg text-sm"
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
                              className="w-24 p-2 border border-swar-border rounded-lg text-right text-sm"
                            />
                          </td>
                          {/* Budget Amount — auto from yearly income × percent */}
                          <td className="px-4 py-3 text-right bg-green-50">
                            <div className="font-semibold text-green-800 text-sm">
                              ₹{budgetAmt.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-green-500">
                              ₹{Math.round(budgetAmt / 12).toLocaleString('en-IN')}/mo
                            </div>
                          </td>
                          {/* Real Amount — auto from actual transactions */}
                          <td className="px-4 py-3 text-right bg-blue-50">
                            <div className={`font-semibold text-sm ${
                              realAmt === 0 ? 'text-gray-400' :
                              isOver ? 'text-red-600' : 'text-blue-700'
                            }`}>
                              ₹{realAmt.toLocaleString('en-IN')}
                            </div>
                            {realAmt > 0 && (
                              <div className={`text-[10px] font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                                {isOver ? '▲ over ' : '▼ saved '}₹{Math.abs(diff).toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                const next = plan.allocations.filter((_, i) => i !== idx);
                                setPlan({ ...plan, allocations: next });
                              }}
                              className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-700" colSpan={3}>Total</td>
                      <td className={`px-4 py-3 text-right font-bold ${allocationTotalOk ? 'text-swar-primary' : 'text-red-600'}`}>
                        {allocationTotal.toFixed(2)}%
                      </td>
                      {/* Total Budget */}
                      <td className="px-4 py-3 text-right bg-green-100">
                        <div className="font-bold text-green-800">₹{yearlyIncome.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-green-600">₹{Math.round(yearlyIncome / 12).toLocaleString('en-IN')}/mo</div>
                      </td>
                      {/* Total Real */}
                      <td className="px-4 py-3 text-right bg-blue-100">
                        <div className={`font-bold ${totalRealExpenses > totalBudgetExpenses ? 'text-red-700' : 'text-blue-800'}`}>
                          ₹{Math.round(totalRealExpenses).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-blue-600">
                          {totalBudgetExpenses > 0 ? `${Math.round((totalRealExpenses / totalBudgetExpenses) * 100)}% used` : ''}
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>
        ) : null}

        {showAllocations && !plan ? null : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-swar-text mb-1">Notes</label>
            <textarea
              value={plan?.notes || ''}
              onChange={(e) => plan && setPlan({ ...plan, notes: e.target.value })}
              className="w-full p-3 border border-swar-border rounded-lg"
              rows={3}
              placeholder="Write your rules (example: Profit target %, savings rules, etc.)"
            />
          </div>
        )}
      </div>

      {/* Expense Budget */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-semibold text-swar-text">Monthly Expense Budget</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const newId = `exp-${Date.now()}`;
                const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7);
                setExpenseBudgets([
                  ...expenseBudgets,
                  {
                    id: newId,
                    month: currentMonth,
                    particular: '',
                    accountHead: '',
                    type: 'expense' as const,
                    amount: 0,
                    reality: 0,
                    recurrence: 'none' as const,
                    customInterval: 1,
                  },
                ]);
              }}
              className="px-4 py-2 bg-swar-primary hover:bg-swar-primary-hover text-white rounded-lg text-sm font-semibold"
            >
              + Add Entry
            </button>
            {expenseBudgets.length > 0 && (
              <>
                <button
                  onClick={autoMatchReality}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                  title="Auto-fill Reality column from actual transactions"
                >
                  <RefreshCw className="h-4 w-4" /> Auto-Match Real
                </button>
                <button
                  onClick={saveExpenseBudgets}
                  disabled={savingExpenses}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingExpenses ? 'Saving…' : 'Save Budgets'}
                </button>
              </>
            )}
          </div>
        </div>

        {expenseBudgets.length === 0 ? (
          <div className="text-swar-text-secondary text-center py-6">
            No expense budget entries yet. Click "Add Entry" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-swar-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Sr. No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Particular</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Account Head</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-swar-text-secondary uppercase">Reality</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-swar-text-secondary uppercase">Variance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase min-w-[150px]">Repeat</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-swar-text-secondary uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenseBudgets.map((entry, idx) => {
                  const variance = entry.reality - entry.amount;
                  const varianceColor = variance > 0 ? 'text-red-600 bg-red-50' : variance < 0 ? 'text-green-600 bg-green-50' : 'text-gray-600';
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <input
                          type="month"
                          value={entry.month}
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].month = e.target.value;
                            setExpenseBudgets(next);
                          }}
                          className="w-full p-2 border border-swar-border rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={entry.particular}
                          placeholder="e.g., Rent, Food"
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].particular = e.target.value;
                            setExpenseBudgets(next);
                          }}
                          className="w-full p-2 border border-swar-border rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={entry.accountHead}
                          placeholder="e.g., Housing"
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].accountHead = e.target.value;
                            setExpenseBudgets(next);
                          }}
                          className="w-full p-2 border border-swar-border rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={entry.type}
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].type = e.target.value === 'income' ? 'income' : 'expense';
                            setExpenseBudgets(next);
                          }}
                          className="w-full p-2 border border-swar-border rounded-lg"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={entry.amount}
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].amount = Number(e.target.value);
                            setExpenseBudgets(next);
                          }}
                          className="w-24 p-2 border border-swar-border rounded-lg text-right"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={entry.reality}
                          placeholder="Auto-update"
                          onChange={(e) => {
                            const next = [...expenseBudgets];
                            next[idx].reality = Number(e.target.value);
                            setExpenseBudgets(next);
                          }}
                          className="w-24 p-2 border border-swar-border rounded-lg text-right"
                        />
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold rounded ${varianceColor}`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 min-w-[150px]">
                        <div className="flex flex-col gap-2">
                          <select
                            value={entry.recurrence || 'none'}
                            onChange={(e) => {
                              const next = [...expenseBudgets];
                              next[idx].recurrence = e.target.value as RecurrenceType;
                              setExpenseBudgets(next);
                            }}
                            className="w-full min-w-[130px] p-2 border border-swar-border rounded-lg text-sm bg-white"
                          >
                            <option value="none">No repeat</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom</option>
                          </select>
                          {entry.recurrence === 'custom' && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-swar-text-secondary">Every</label>
                              <input
                                type="number"
                                min="1"
                                value={entry.customInterval || 1}
                                onChange={(e) => {
                                  const next = [...expenseBudgets];
                                  next[idx].customInterval = Math.max(1, Number(e.target.value));
                                  setExpenseBudgets(next);
                                }}
                                className="w-16 p-1 border border-swar-border rounded text-sm"
                              />
                              <span className="text-xs text-swar-text-secondary">months</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-1">
                          {(entry.recurrence && entry.recurrence !== 'none') && (
                            <button
                              onClick={() => {
                                // Always generate 1 year (12 months) of entries
                                const newEntries = generateRepeatingEntries(entry, 12);
                                if (newEntries.length === 0) {
                                  alert('All repeat entries already exist!');
                                } else {
                                  setExpenseBudgets([...expenseBudgets, ...newEntries]);
                                  alert(`✓ Generated ${newEntries.length} repeating entries`);
                                }
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold"
                            >
                              ↻ Repeat
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setExpenseBudgets(expenseBudgets.filter((_, i) => i !== idx));
                            }}
                            className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              {expenseBudgets.length > 0 && (() => {
                const totalBudget = expenseBudgets.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
                const totalIncome = expenseBudgets.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
                const totalRealExp = expenseBudgets.filter(e => e.type === 'expense').reduce((s, e) => s + e.reality, 0);
                const totalRealInc = expenseBudgets.filter(e => e.type === 'income').reduce((s, e) => s + e.reality, 0);
                const netBudget = totalIncome - totalBudget;
                const netReal = totalRealInc - totalRealExp;
                return (
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold">TOTAL</td>
                      <td className="px-4 py-3 text-sm"></td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-green-700">Inc: ₹{totalIncome.toLocaleString()}</div>
                        <div className="text-red-700">Exp: ₹{totalBudget.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">₹{totalBudget.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm">₹{totalRealExp.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-center text-sm font-bold ${netBudget >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        <div>{netReal >= 0 ? '+' : ''}{netReal.toLocaleString()} <span className="text-xs font-normal">real</span></div>
                        <div className="text-xs text-gray-500">{netBudget >= 0 ? '+' : ''}{netBudget.toLocaleString()} plan</div>
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
      </div>

      {/* Monthly Budget vs Actual — Indian FY (Apr→Mar) with Quarter Blocks */}
      {plan && (() => {
        const now = new Date();
        const fy = plan.year || year; // FY start year (e.g. 2026 means Apr 2026 - Mar 2027)

        // Indian FY months: Apr(fy) ... Dec(fy), Jan(fy+1) ... Mar(fy+1)
        const fyMonths = [
          { y: fy, m: 4,  label: 'Apr' },
          { y: fy, m: 5,  label: 'May' },
          { y: fy, m: 6,  label: 'Jun' },
          { y: fy, m: 7,  label: 'Jul' },
          { y: fy, m: 8,  label: 'Aug' },
          { y: fy, m: 9,  label: 'Sep' },
          { y: fy, m: 10, label: 'Oct' },
          { y: fy, m: 11, label: 'Nov' },
          { y: fy, m: 12, label: 'Dec' },
          { y: fy+1, m: 1, label: 'Jan' },
          { y: fy+1, m: 2, label: 'Feb' },
          { y: fy+1, m: 3, label: 'Mar' },
        ];
        const allMonths = fyMonths.map(({ y, m }) => `${y}-${String(m).padStart(2, '0')}`);

        const quarters = [
          { label: `Q1 · Apr–Jun ${fy}`,   color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   idxs: [0,1,2]  },
          { label: `Q2 · Jul–Sep ${fy}`,   color: 'green',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  idxs: [3,4,5]  },
          { label: `Q3 · Oct–Dec ${fy}`,   color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', idxs: [6,7,8]  },
          { label: `Q4 · Jan–Mar ${fy+1}`, color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', idxs: [9,10,11]},
        ];

        const monthlyIncomeTgt = plan.incomeTargetMonthly || ((plan.incomeTargetYearly || 0) / 12) || 0;
        const nowMk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        // Compute actual income + expense per month from real transactions
        const txByMonth: Record<string, { income: number; expense: number }> = {};
        realTransactions.forEach((t: any) => {
          const d = new Date(t.date);
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!txByMonth[mk]) txByMonth[mk] = { income: 0, expense: 0 };
          if (t.type === 'income') txByMonth[mk].income += t.amount || 0;
          // Expenses include both regular expenses AND loan repayments (EMI)
          // Loan receipts (type='loan') are NOT counted as income
          if (t.type === 'expense' || t.type === 'emi') txByMonth[mk].expense += t.amount || 0;
        });

        // Match allocation to actual using smart matcher
        // Expense allocations include both regular expenses AND loan repayments (emi)
        // Loans received (type='loan') are NEVER counted as income or expense
        const getAllocActual = (alloc: BudgetAllocation, mk: string): number => {
          // Sum all transactions in this month that match this allocation
          return realTransactions
            .filter((t: any) => {
              // Income allocations: only earned income (never loans)
              if (alloc.kind === 'profit') return false; // profit allocations not matched to transactions
              // Expense allocations: count both expense and emi (loan repayments)
              const isRelevantType = t.type === 'expense' || t.type === 'emi';
              if (!isRelevantType) return false;
              const d = new Date(t.date);
              const tmk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              return tmk === mk && matchesAlloc(alloc, t.category || '', t.description || '');
            })
            .reduce((s: number, t: any) => s + (t.amount || 0), 0);
        };

        // Helper to render a single month cell
        const MonthCell = ({ mk, budget, actual, kind }: { mk: string; budget: number; actual: number; kind: 'income' | 'expense' }) => {
          const diff = kind === 'expense' ? budget - actual : actual - budget;
          const good = diff >= 0;
          const isCurrent = mk === nowMk;
          return (
            <td className={`py-2 px-1 text-center align-top border-r border-gray-100 ${isCurrent ? 'bg-yellow-50' : ''}`} style={{ minWidth: '100px', width: '100px' }}>
              <div className="text-[10px] text-gray-400 leading-tight">₹{Math.round(budget).toLocaleString()}</div>
              <div className={`text-xs font-bold leading-tight mt-0.5 ${
                kind === 'expense'
                  ? (actual > budget ? 'text-red-600' : actual > 0 ? 'text-gray-800' : 'text-gray-400')
                  : (actual >= budget ? 'text-green-700' : actual > 0 ? 'text-orange-600' : 'text-gray-400')
              }`}>
                ₹{Math.round(actual).toLocaleString()}
              </div>
              {actual > 0 && (
                <div className={`text-[10px] font-semibold leading-tight ${good ? 'text-green-600' : 'text-red-500'}`}>
                  {good ? '+' : ''}{Math.round(diff).toLocaleString()}
                </div>
              )}
            </td>
          );
        };

        // Quarter total cell
        const QuarterCell = ({ idxs, budget, kind }: { idxs: number[]; budget: number; kind: 'income' | 'expense' }) => {
          const qtBudget = budget * 3;
          const qtActual = idxs.reduce((s, i) => {
            const mk = allMonths[i];
            return s + (kind === 'income' ? txByMonth[mk]?.income || 0 : txByMonth[mk]?.expense || 0);
          }, 0);
          const diff = kind === 'expense' ? qtBudget - qtActual : qtActual - qtBudget;
          return (
            <td className="py-2 px-2 text-center align-top bg-gray-100 border-r-2 border-gray-300" style={{ minWidth: '90px', width: '90px' }}>
              <div className="text-[10px] text-gray-500 font-medium">₹{Math.round(qtBudget).toLocaleString()}</div>
              <div className={`text-xs font-bold ${kind==='expense'?(qtActual>qtBudget?'text-red-600':'text-gray-800'):(qtActual>=qtBudget?'text-green-700':'text-orange-600')}`}>
                ₹{Math.round(qtActual).toLocaleString()}
              </div>
              <div className={`text-[10px] font-semibold ${diff>=0?'text-green-600':'text-red-500'}`}>
                {diff>=0?'+':''}{Math.round(diff).toLocaleString()}
              </div>
            </td>
          );
        };

        return (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold text-swar-text">📊 Monthly Budget vs Actual</h2>
                <p className="text-xs text-gray-500">Indian FY {fy}–{fy+1} &nbsp;•&nbsp; Apr {fy} → Mar {fy+1} &nbsp;•&nbsp; Scroll →</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={loadRealTransactions} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
                {(['budget','reality','variance'] as const).map(t => (
                  <button key={t} onClick={() => downloadHtml(t)} className="inline-flex items-center gap-1 px-2 py-1.5 border border-gray-200 bg-white rounded text-xs font-medium hover:bg-gray-50">
                    <Download className="h-3 w-3" /> {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-3 text-xs text-gray-500 flex-wrap">
              <span className="text-gray-400">Top: Budget target</span>
              <span className="font-bold text-gray-700">Middle: Actual</span>
              <span className="text-green-600 font-semibold">+Saved / +Earned</span>
              <span className="text-red-500 font-semibold">-Over budget</span>
              <span className="bg-yellow-50 px-2 rounded">Current month</span>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                  {/* Quarter row */}
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 border-b-2 border-gray-200 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase" style={{ minWidth: '155px', width: '155px' }}>Budget Head</th>
                    <th className="bg-gray-50 border-b-2 border-gray-200 px-1 py-2 text-center text-xs font-bold text-gray-500" style={{ minWidth: '40px', width: '40px' }}>%</th>
                    {quarters.map(q => (
                      <React.Fragment key={q.label}>
                        <th colSpan={3} className={`${q.bg} border-b-2 ${q.border} px-2 py-2 text-center text-xs font-bold ${q.text} uppercase`} style={{ minWidth: '300px' }}>
                          {q.label}
                        </th>
                        <th className="bg-gray-100 border-b-2 border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase" style={{ minWidth: '90px', width: '90px' }}>
                          Total
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="bg-gray-200 border-b-2 border-gray-400 px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase" style={{ minWidth: '90px', width: '90px' }}>FY Total</th>
                  </tr>
                  {/* Month name row */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1" style={{ minWidth: '155px' }}></th>
                    <th className="px-1 py-1" style={{ minWidth: '40px' }}></th>
                    {quarters.map(q => (
                      <React.Fragment key={q.label}>
                        {q.idxs.map(i => (
                          <th key={i} className={`px-1 py-1.5 text-center text-xs font-semibold border-r border-gray-100 ${allMonths[i] === nowMk ? 'bg-yellow-100 text-yellow-800' : `${q.bg} ${q.text}`}`} style={{ minWidth: '100px', width: '100px' }}>
                            {fyMonths[i].label} {fyMonths[i].y}
                          </th>
                        ))}
                        <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-500 bg-gray-100 border-r-2 border-gray-300" style={{ minWidth: '90px', width: '90px' }}>Q Sub</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-600 bg-gray-200" style={{ minWidth: '90px' }}>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Income Row — earned income only, loans excluded ── */}
                  <tr className="bg-green-50 border-b-2 border-green-300">
                    <td className="sticky left-0 z-10 bg-green-50 px-3 py-2 border-r border-green-200" style={{ minWidth: '155px' }}>
                      <div className="font-bold text-green-800 text-sm">💰 Real Income</div>
                      <div className="text-[10px] text-green-600">Earned only (excl. loans)</div>
                    </td>
                    <td className="px-1 py-2 text-center text-xs font-bold text-green-700">100%</td>
                    {quarters.map(q => (
                      <React.Fragment key={q.label}>
                        {q.idxs.map(i => {
                          const mk = allMonths[i];
                          const actual = txByMonth[mk]?.income || 0;
                          return <MonthCell key={mk} mk={mk} budget={monthlyIncomeTgt} actual={actual} kind="income" />;
                        })}
                        <QuarterCell idxs={q.idxs} budget={monthlyIncomeTgt} kind="income" />
                      </React.Fragment>
                    ))}
                    {/* FY Total */}
                    <td className="py-2 px-2 text-center align-top bg-gray-100 border-l-2 border-gray-300" style={{ minWidth: '90px' }}>
                      <div className="text-[10px] text-gray-500">₹{Math.round((plan.incomeTargetYearly||0)).toLocaleString()}</div>
                      {(() => {
                        const tot = realTransactions.filter((t:any) => t.type==='income' && allMonths.includes(`${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth()+1).padStart(2,'0')}`)).reduce((s:number,t:any)=>s+(t.amount||0),0);
                        const diff = tot - (plan.incomeTargetYearly||0);
                        return (<><div className={`text-xs font-bold ${tot>=(plan.incomeTargetYearly||0)?'text-green-700':'text-orange-600'}`}>₹{Math.round(tot).toLocaleString()}</div><div className={`text-[10px] font-semibold ${diff>=0?'text-green-600':'text-red-500'}`}>{diff>=0?'+':''}{Math.round(diff).toLocaleString()}</div></>);
                      })()}
                    </td>
                  </tr>

                  {/* ── Allocation Rows ── */}
                  {(plan.allocations || []).map((alloc, ai) => {
                    const monthlyBudget = (alloc.percent / 100) * monthlyIncomeTgt;
                    const yearlyBudget = monthlyBudget * 12;
                    let fyActualTotal = 0;
                    return (
                      <tr key={alloc.key} className={`border-b border-gray-100 ${ai % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 border-r border-gray-200 ${ai % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ minWidth: '155px' }}>
                          <div className="font-semibold text-swar-text text-sm">{alloc.label}</div>
                          <div className="text-[10px] text-swar-text-secondary capitalize">{alloc.kind} • {alloc.key}</div>
                        </td>
                        <td className="px-1 py-2 text-center text-xs font-medium text-gray-600">{alloc.percent}%</td>
                        {quarters.map(q => (
                          <React.Fragment key={q.label}>
                            {q.idxs.map(i => {
                              const mk = allMonths[i];
                              const actual = getAllocActual(alloc, mk);
                              fyActualTotal += actual;
                              return <MonthCell key={mk} mk={mk} budget={monthlyBudget} actual={actual} kind="expense" />;
                            })}
                            {/* Quarter sub-total */}
                            {(() => {
                              const qAct = q.idxs.reduce((s,i)=>s+getAllocActual(alloc,allMonths[i]),0);
                              const qBud = monthlyBudget * 3;
                              const diff = qBud - qAct;
                              return (
                                <td className="py-2 px-2 text-center align-top bg-gray-100 border-r-2 border-gray-300" style={{ minWidth: '90px' }}>
                                  <div className="text-[10px] text-gray-500">₹{Math.round(qBud).toLocaleString()}</div>
                                  <div className={`text-xs font-bold ${qAct>qBud?'text-red-600':'text-gray-700'}`}>₹{Math.round(qAct).toLocaleString()}</div>
                                  <div className={`text-[10px] font-semibold ${diff>=0?'text-green-600':'text-red-500'}`}>{diff>=0?'+':''}{Math.round(diff).toLocaleString()}</div>
                                </td>
                              );
                            })()}
                          </React.Fragment>
                        ))}
                        {/* FY Total */}
                        <td className="py-2 px-2 text-center align-top bg-gray-100 border-l-2 border-gray-300" style={{ minWidth: '90px' }}>
                          <div className="text-[10px] text-gray-500">₹{Math.round(yearlyBudget).toLocaleString()}</div>
                          <div className={`text-xs font-bold ${fyActualTotal>yearlyBudget?'text-red-600':'text-gray-700'}`}>₹{Math.round(fyActualTotal).toLocaleString()}</div>
                          {(() => { const diff=yearlyBudget-fyActualTotal; return <div className={`text-[10px] font-semibold ${diff>=0?'text-green-600':'text-red-500'}`}>{diff>=0?'+':''}{Math.round(diff).toLocaleString()}</div>; })()}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Total Expense Row ── */}
                  <tr className="bg-red-50 border-t-2 border-red-300">
                    <td className="sticky left-0 z-10 bg-red-50 px-3 py-2 border-r border-red-200" style={{ minWidth: '155px' }}>
                      <div className="font-bold text-red-800 text-sm">💸 Total Expense</div>
                      <div className="text-[10px] text-red-600">Budget vs Actual</div>
                    </td>
                    <td className="px-1 py-2 text-center text-xs font-bold text-red-700">
                      {(plan.allocations||[]).filter(a=>a.kind==='expense').reduce((s,a)=>s+a.percent,0)}%
                    </td>
                    {quarters.map(q => (
                      <React.Fragment key={q.label}>
                        {q.idxs.map(i => {
                          const mk = allMonths[i];
                          const totalExpBudget = (plan.allocations||[]).filter(a=>a.kind==='expense').reduce((s,a)=>s+(a.percent/100)*monthlyIncomeTgt,0);
                          const actualExp = txByMonth[mk]?.expense || 0;
                          return <MonthCell key={mk} mk={mk} budget={totalExpBudget} actual={actualExp} kind="expense" />;
                        })}
                        <QuarterCell idxs={q.idxs} budget={(plan.allocations||[]).filter(a=>a.kind==='expense').reduce((s,a)=>s+(a.percent/100)*monthlyIncomeTgt,0)} kind="expense" />
                      </React.Fragment>
                    ))}
                    <td className="py-2 px-2 text-center align-top bg-gray-100 border-l-2 border-gray-300" style={{ minWidth: '90px' }}>
                      {(() => {
                        const yBud=(plan.allocations||[]).filter(a=>a.kind==='expense').reduce((s,a)=>s+(a.percent/100)*(plan.incomeTargetYearly||0),0);
                        const yAct=realTransactions.filter((t:any)=>t.type==='expense'&&allMonths.includes(`${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth()+1).padStart(2,'0')}`)).reduce((s:number,t:any)=>s+(t.amount||0),0);
                        const diff=yBud-yAct;
                        return (<><div className="text-[10px] text-gray-500">₹{Math.round(yBud).toLocaleString()}</div><div className={`text-xs font-bold ${yAct>yBud?'text-red-700':'text-green-700'}`}>₹{Math.round(yAct).toLocaleString()}</div><div className={`text-[10px] font-semibold ${diff>=0?'text-green-600':'text-red-500'}`}>{diff>=0?'+':''}{Math.round(diff).toLocaleString()}</div></>);
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
  );
}
