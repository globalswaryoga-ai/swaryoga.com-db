'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  FileText,
  Building,
  CreditCard,
  Wallet,
  Target,
  AlertTriangle,
  Eye,
  X,
  Check
} from 'lucide-react';
import { filterTransactionsByDateRange, getReportPeriodRange, type ReportPeriodKey } from '@/lib/accountingReportPeriod';
import MyBudgetPanel from '@/components/life-planner/MyBudgetPanel';

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'investment' | 'loan';
  accountNumber?: string;
  bankName?: string;
  balance: number;
  created_at: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'investment_in' | 'investment_out' | 'loan' | 'emi';
  amount: number;
  description: string;
  category: string;
  account_id: string;
  account_name: string;
  date: string;
  mode: 'cash' | 'bank' | 'card' | 'online';
  investmentId?: string;
  investmentName?: string;
  created_at: string;
}

interface Investment {
  id: string;
  name: string;
  type: 'investment_in' | 'investment_out';
  amount: number;
  interest_rate: number;
  dividend_rate: number;
  repayment_mode: 'monthly' | 'quarterly' | 'yearly' | 'lumpsum';
  reminder_enabled: boolean;
  next_due_date?: string;
  account_id: string;
  account_name: string;
  status: 'active' | 'completed' | 'cancelled';
  amountReceivedDate?: string;
  dividendPayFrequency?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  monthlyRate?: number;
  quarterlyRate?: number;
  semiannualRate?: number;
  yearlyRate?: number;
  dividendPaid?: number;
  created_at: string;
}

export default function LifePlannerAccountingPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'investments' | 'dividend' | 'reports' | 'budget'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodKey>('yearly');
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [generatingReport, setGeneratingReport] = useState(false);
  const [budgetPlan, setBudgetPlan] = useState<any>(null);
  const [showDividendViewModal, setShowDividendViewModal] = useState(false);
  const [selectedInvestmentView, setSelectedInvestmentView] = useState<Investment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingDividendIndex, setEditingDividendIndex] = useState<number | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{
    dueDate: string;
    amount: number;
    investmentId: string;
    investmentName: string;
    fromSchedule: boolean;
    transactionId?: string;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paidDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    paidPenalty: 0,
    giftAmount: 0
  });

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    // Try all admin token keys (CRM admin stores token as adminToken/admin_token)
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('crm_token') ||
        localStorage.getItem('lifePlannerToken') ||
        localStorage.getItem('token')
      : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    return headers;
  }, []);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as Account['type'],
    accountNumber: '',
    bankName: '',
    balance: 0,
    budgetAllocationId: null as string | null
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as Transaction['type'],
    amount: 0,
    description: '',
    category: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'cash' as Transaction['mode'],
    investmentId: '',
    investmentName: ''
  });

  const [investmentForm, setInvestmentForm] = useState({
    name: '',
    type: 'investment_in' as Investment['type'],
    amount: 0,
    interest_rate: 0,
    dividend_rate: 0,
    repayment_mode: 'monthly' as Investment['repayment_mode'],
    reminder_enabled: true,
    next_due_date: '',
    account_id: '',
    status: 'active' as Investment['status'],
    amountReceivedDate: new Date().toISOString().split('T')[0],
    dividendPayFrequency: 'yearly' as Investment['dividendPayFrequency'],
    monthlyRate: 0,
    quarterlyRate: 0,
    semiannualRate: 0,
    yearlyRate: 0,
    dividendPaid: 0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/crm-planner/data?type=accounting', { headers });

      if (res.ok) {
        const response = await res.json();
        const accountingData = response.data || {};

        setAccounts(accountingData.accounts || []);
        setTransactions(accountingData.transactions || []);
        setInvestments(accountingData.investments || []);
        setBudgetPlan(accountingData.budget || null);
      } else {
        console.error('Failed to fetch accounting data');
      }
    } catch (error) {
      console.error('Error loading accounting data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Generate dividend payment schedule with actual payment records
  // First dividend: 2 months after amount received date, then every 6 months on March 31 & Sept 30
  const generateDividendSchedule = (investment: Investment) => {
    const schedule: any[] = [];
    if (!investment.amountReceivedDate || !investment.dividendPayFrequency) return schedule;

    const today = new Date();
    // Parse received date ensuring UTC to avoid timezone issues
    const [year, month, day] = investment.amountReceivedDate.split('-').map(Number);
    const receivedDate = new Date(Date.UTC(year, month - 1, day));

    // Get the annual rate for calculations
    // dividend_rate is the rate for the specified frequency (not annual)
    // Frequency-specific rates take priority, but dividend_rate is the fallback
    const frequencyRate = investment[`${investment.dividendPayFrequency}Rate`] || investment.dividend_rate || 0;

    // Convert frequency rate to annual rate
    // The rate represents the percentage for that specific dividend period
    let annualRate = frequencyRate;
    if (investment.dividendPayFrequency === 'semiannual') {
      annualRate = frequencyRate * 2; // 2 periods per year = annual
    } else if (investment.dividendPayFrequency === 'quarterly') {
      annualRate = frequencyRate * 4; // 4 periods per year = annual
    } else if (investment.dividendPayFrequency === 'monthly') {
      annualRate = frequencyRate * 12; // 12 periods per year = annual
    }
    // For 'yearly', frequencyRate is already annual

    // Helper: Find next fixed date (March 30 or Sept 30) from a given date (using UTC to avoid timezone issues)
    const getNextFixedDate = (fromDate: Date): Date => {
      const year = fromDate.getUTCFullYear();
      const month = fromDate.getUTCMonth();
      const date = fromDate.getUTCDate();

      // Create dates in UTC
      const march30 = new Date(Date.UTC(year, 2, 30));
      const sept30 = new Date(Date.UTC(year, 8, 30));

      if (fromDate <= march30) return march30;
      if (fromDate <= sept30) return sept30;
      return new Date(Date.UTC(year + 1, 2, 30));
    };

    // Helper: Calculate days between two dates
    const daysBetween = (date1: Date, date2: Date): number => {
      return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Get all dividend payment transactions for this investment, sorted by date
    const dividendTransactions = transactions
      .filter(t => t.investmentId === investment.id && t.category === 'dividend_payment' && t.type === 'expense')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate schedule for 20 periods
    let currentPeriodStart = new Date(receivedDate);

    for (let i = 0; i < 20; i++) {
      const nextFixedDate = getNextFixedDate(currentPeriodStart);
      const dueDate = new Date(nextFixedDate); // Due on the fixed date

      // Calculate dividend amount based on days in this period
      let daysInPeriod = daysBetween(currentPeriodStart, dueDate);
      // Add 1 to include the end date (inclusive calculation)
      daysInPeriod = Math.max(daysInPeriod + 1, 1);

      // Calculate prorated dividend: (amount × annual_rate × days) / 365
      let calculatedAmount = (investment.amount * annualRate * daysInPeriod) / (100 * 365);

      // Format date in UTC to avoid timezone display issues
      const dueDateStr = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueDate.getUTCDate()).padStart(2, '0')}`;

      // Find transaction that matches this period
      const nextPeriodStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate() + 1));
      const nextNextFixedDate = i + 1 < 20 ? getNextFixedDate(nextPeriodStart) : new Date(Date.UTC(dueDate.getUTCFullYear() + 1, dueDate.getUTCMonth(), dueDate.getUTCDate()));

      const paymentTransaction = dividendTransactions.find(t => {
        const txnDate = new Date(t.date);
        return txnDate >= dueDate && txnDate < nextNextFixedDate;
      });

      let isPaid = false;
      let paidDate = '';
      let penalty = 0;
      let totalDue = calculatedAmount;

      if (paymentTransaction) {
        isPaid = true;
        paidDate = paymentTransaction.date;

        // Calculate penalty if paid late
        const paymentDateObj = new Date(paidDate);
        if (paymentDateObj > dueDate) {
          const daysOverdue = daysBetween(dueDate, paymentDateObj);
          penalty = (calculatedAmount * 12 * daysOverdue) / (100 * 365);
        }
        totalDue = calculatedAmount + penalty;
      } else {
        // Not yet paid - check if overdue
        const isOverdue = dueDate < today;
        if (isOverdue) {
          const daysOverdue = daysBetween(dueDate, today);
          penalty = (calculatedAmount * 12 * daysOverdue) / (100 * 365);
          totalDue = calculatedAmount + penalty;
        }
      }

      schedule.push({
        dueDate: dueDateStr,
        amount: calculatedAmount,
        penalty: penalty,
        totalDue: totalDue,
        isPaid: isPaid,
        paidDate: paidDate,
        isOverdue: dueDate < today && !isPaid,
        daysOverdue: !isPaid && dueDate < today ? daysBetween(dueDate, today) : 0,
        transactionId: paymentTransaction?.id,
        daysInPeriod: daysInPeriod
      });

      // Move to next period
      currentPeriodStart = new Date(nextNextFixedDate);
    }

    return schedule;
  };

  // Save all accounting data to unified Life Planner API
  const saveAccountingData = useCallback(async (updatedAccounts: Account[], updatedTransactions: Transaction[], updatedInvestments: Investment[], updatedBudget: any) => {
    try {
      const headers = getAuthHeaders();
      const accountingPayload = {
        accounts: updatedAccounts,
        transactions: updatedTransactions,
        investments: updatedInvestments,
        budget: updatedBudget
      };

      const response = await fetch('/api/crm-planner/data', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'accounting',
          data: accountingPayload
        })
      });

      if (!response.ok) {
        console.error('Failed to save accounting data');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error saving accounting data:', error);
      return false;
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStats = (txns: Transaction[] = transactions) => {
    const totalIncome = txns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalInvestments = investments.filter(inv => inv.status === 'active').reduce((sum, inv) => sum + inv.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      totalBalance,
      totalInvestments,
      netWorth: totalBalance + totalInvestments
    };
  };

  const calculateDashboardDividends = () => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let toBePaid = 0;
    let paid = 0;
    let overdue = 0;

    investments.filter(inv => inv.status === 'active' && inv.type === 'investment_in').forEach(inv => {
      if (!inv.amountReceivedDate) return;

      const receivedDate = new Date(inv.amountReceivedDate);
      const daysSinceReceived = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

      let frequencyRate = 0;
      let frequencyDays = 365;

      if (inv.dividendPayFrequency === 'monthly') {
        frequencyRate = inv.monthlyRate || 0;
        frequencyDays = 30;
      } else if (inv.dividendPayFrequency === 'quarterly') {
        frequencyRate = inv.quarterlyRate || 0;
        frequencyDays = 90;
      } else if (inv.dividendPayFrequency === 'semiannual') {
        frequencyRate = inv.semiannualRate || 0;
        frequencyDays = 180;
      } else {
        frequencyRate = inv.yearlyRate || 0;
        frequencyDays = 365;
      }

      const accruedDividend = (inv.amount * frequencyRate) / 100 * (daysSinceReceived / frequencyDays);
      const alreadyPaid = inv.dividendPaid || 0;
      const pendingDividend = Math.max(0, accruedDividend - alreadyPaid);

      let nextPaymentDate = new Date(receivedDate);
      nextPaymentDate.setDate(nextPaymentDate.getDate() + frequencyDays);

      paid += alreadyPaid;

      if (nextPaymentDate < oneYearAgo && pendingDividend > 0) {
        overdue += pendingDividend;
      } else {
        toBePaid += pendingDividend;
      }
    });

    return {
      toBePaid: Math.round(toBePaid * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      overdue: Math.round(overdue * 100) / 100,
    };
  };

  const calculateDividends = () => {
    const now = new Date();
    let totalDividend = 0;
    let dividendPaid = 0;
    let dividendPending = 0;
    let dividendOverdue = 0;

    const investmentDividends = investments.filter(inv => inv.status === 'active' && inv.type === 'investment_in').map(inv => {
      if (!inv.amountReceivedDate) return null;

      const receivedDate = new Date(inv.amountReceivedDate);
      const daysSinceReceived = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get the rate based on dividend pay frequency
      let frequencyRate = 0;
      let frequencyDays = 365;
      let frequencyLabel = 'yearly';

      if (inv.dividendPayFrequency === 'monthly') {
        frequencyRate = inv.monthlyRate || 0;
        frequencyDays = 30;
        frequencyLabel = 'monthly';
      } else if (inv.dividendPayFrequency === 'quarterly') {
        frequencyRate = inv.quarterlyRate || 0;
        frequencyDays = 90;
        frequencyLabel = 'quarterly';
      } else if (inv.dividendPayFrequency === 'semiannual') {
        frequencyRate = inv.semiannualRate || 0;
        frequencyDays = 180;
        frequencyLabel = 'semiannual';
      } else {
        frequencyRate = inv.yearlyRate || 0;
        frequencyDays = 365;
        frequencyLabel = 'yearly';
      }

      // Calculate accrued dividend based on frequency rate
      const accruedDividend = (inv.amount * frequencyRate) / 100 * (daysSinceReceived / frequencyDays);

      // Calculate next payment date based on frequency
      let nextPaymentDate = new Date(receivedDate);
      nextPaymentDate.setDate(nextPaymentDate.getDate() + frequencyDays);

      const alreadyPaid = inv.dividendPaid || 0;
      const pendingDividend = Math.max(0, accruedDividend - alreadyPaid);
      const isOverdue = nextPaymentDate < now && pendingDividend > 0;

      totalDividend += accruedDividend;
      dividendPaid += alreadyPaid;
      if (isOverdue) {
        dividendOverdue += pendingDividend;
      } else {
        dividendPending += pendingDividend;
      }

      return {
        name: inv.name,
        amount: inv.amount,
        dividendRate: frequencyRate,
        frequency: inv.dividendPayFrequency,
        receivedDate: inv.amountReceivedDate,
        accruedDividend: Math.round(accruedDividend * 100) / 100,
        alreadyPaid,
        pending: Math.round(pendingDividend * 100) / 100,
        nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
        isOverdue
      };
    }).filter(Boolean);

    return {
      totalDividend: Math.round(totalDividend * 100) / 100,
      dividendPaid: Math.round(dividendPaid * 100) / 100,
      dividendPending: Math.round(dividendPending * 100) / 100,
      dividendOverdue: Math.round(dividendOverdue * 100) / 100,
      dividendToBePaid: Math.round((dividendPending) * 100) / 100,
      investmentDividends
    };
  };

  const generatePDF = async (reportType: 'pl' | 'balancesheet' | 'income') => {
    setGeneratingReport(true);
    try {
      const range = getReportPeriodRange({ period: reportPeriod, year: reportYear, monthISO: reportMonth });
      const reportTransactions = filterTransactionsByDateRange(transactions, range.startDate, range.endDate);
      const reportStats = calculateStats(reportTransactions);

      const response = await fetch('/api/accounting/generate-pdf', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          year: reportYear,
          periodLabel: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          fileTag: range.fileTag,
          accounts,
          transactions: reportTransactions,
          investments,
          stats: reportStats
        })
      });

      if (!response.ok) throw new Error('Report generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-${range.fileTag}.html`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name) {
      alert('Please enter account name');
      return;
    }

    try {
      let updatedAccounts = accounts;

      if (editingAccount) {
        updatedAccounts = accounts.map(acc =>
          acc.id === editingAccount.id
            ? { ...accountForm, id: editingAccount.id, created_at: editingAccount.created_at }
            : acc
        );
      } else {
        const newAccount: Account = {
          ...accountForm,
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString()
        };
        updatedAccounts = [...accounts, newAccount];
      }

      const success = await saveAccountingData(updatedAccounts, transactions, investments, budgetPlan);

      if (success) {
        setAccounts(updatedAccounts);
        setShowAccountModal(false);
        setEditingAccount(null);
        resetAccountForm();
        alert(editingAccount ? 'Account updated successfully' : 'Account created successfully');
      } else {
        alert('Failed to save account');
      }
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Error saving account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        const updatedAccounts = accounts.filter(acc => acc.id !== id);
        const success = await saveAccountingData(updatedAccounts, transactions, investments, budgetPlan);

        if (success) {
          setAccounts(updatedAccounts);
          alert('Account deleted successfully');
        } else {
          alert('Failed to delete account');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Error deleting account');
      }
    }
  };

  const handleSaveTransaction = async () => {
    if (!transactionForm.description || !transactionForm.account_id) {
      alert('Please fill all fields');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === transactionForm.account_id);
    if (!selectedAccount) return;

    try {
      let updatedTransactions = transactions;
      const transactionData = {
        ...transactionForm,
        account_name: selectedAccount.name
      };

      if (editingTransaction) {
        updatedTransactions = transactions.map(t =>
          t.id === editingTransaction.id
            ? { ...transactionData, id: editingTransaction.id, created_at: editingTransaction.created_at }
            : t
        );
      } else {
        const newTransaction: Transaction = {
          ...transactionData,
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString()
        };
        updatedTransactions = [...transactions, newTransaction];
      }

      const success = await saveAccountingData(accounts, updatedTransactions, investments, budgetPlan);

      if (success) {
        setTransactions(updatedTransactions);
        setShowTransactionModal(false);
        setEditingTransaction(null);
        resetTransactionForm();
        alert(editingTransaction ? 'Transaction updated successfully' : 'Transaction created successfully');
      } else {
        alert('Failed to save transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        const updatedTransactions = transactions.filter(t => t.id !== id);
        const success = await saveAccountingData(accounts, updatedTransactions, investments, budgetPlan);

        if (success) {
          setTransactions(updatedTransactions);
          alert('Transaction deleted successfully');
        } else {
          alert('Failed to delete transaction');
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction');
      }
    }
  };

  const handleSaveInvestment = async () => {
    if (!investmentForm.name || !investmentForm.account_id) {
      alert('Please fill all fields');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === investmentForm.account_id);
    if (!selectedAccount) return;

    try {
      let updatedInvestments = investments;
      const investmentData = {
        ...investmentForm,
        account_name: selectedAccount.name
      };

      if (editingInvestment) {
        updatedInvestments = investments.map(inv =>
          inv.id === editingInvestment.id
            ? { ...investmentData, id: editingInvestment.id, created_at: editingInvestment.created_at }
            : inv
        );
      } else {
        const newInvestment: Investment = {
          ...investmentData,
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString()
        };
        updatedInvestments = [...investments, newInvestment];
      }

      const success = await saveAccountingData(accounts, transactions, updatedInvestments, budgetPlan);

      if (success) {
        setInvestments(updatedInvestments);
        setShowInvestmentModal(false);
        setEditingInvestment(null);
        resetInvestmentForm();
        alert(editingInvestment ? 'Investment updated successfully' : 'Investment created successfully');
      } else {
        alert('Failed to save investment');
      }
    } catch (error) {
      console.error('Error saving investment:', error);
      alert('Error saving investment');
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        const updatedInvestments = investments.filter(inv => inv.id !== id);
        const success = await saveAccountingData(accounts, transactions, updatedInvestments, budgetPlan);

        if (success) {
          setInvestments(updatedInvestments);
          alert('Investment deleted successfully');
        } else {
          alert('Failed to delete investment');
        }
      } catch (error) {
        console.error('Error deleting investment:', error);
        alert('Error deleting investment');
      }
    }
  };

  const resetAccountForm = () => {
    setAccountForm({ name: '', type: 'bank', accountNumber: '', bankName: '', balance: 0, budgetAllocationId: null });
  };

  const resetTransactionForm = () => {
    setTransactionForm({ type: 'income', amount: 0, description: '', category: '', account_id: '', date: new Date().toISOString().split('T')[0], mode: 'cash', investmentId: '', investmentName: '' });
  };

  const resetInvestmentForm = () => {
    setInvestmentForm({ name: '', type: 'investment_in', amount: 0, interest_rate: 0, dividend_rate: 0, repayment_mode: 'monthly', reminder_enabled: true, next_due_date: '', account_id: '', status: 'active', amountReceivedDate: new Date().toISOString().split('T')[0], dividendPayFrequency: 'yearly', monthlyRate: 0, quarterlyRate: 0, semiannualRate: 0, yearlyRate: 0, dividendPaid: 0 });
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountForm({ name: account.name, type: account.type, accountNumber: account.accountNumber || '', bankName: account.bankName || '', balance: account.balance, budgetAllocationId: (account as any).budgetAllocationId || null });
    setShowAccountModal(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({ type: transaction.type, amount: transaction.amount, description: transaction.description, category: transaction.category, account_id: transaction.account_id, date: transaction.date, mode: transaction.mode, investmentId: transaction.investmentId || '', investmentName: transaction.investmentName || '' });
    setShowTransactionModal(true);
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setInvestmentForm({ name: investment.name, type: investment.type, amount: investment.amount, interest_rate: investment.interest_rate, dividend_rate: investment.dividend_rate, repayment_mode: investment.repayment_mode, reminder_enabled: investment.reminder_enabled, next_due_date: investment.next_due_date || '', account_id: investment.account_id, status: investment.status, amountReceivedDate: investment.amountReceivedDate || '', dividendPayFrequency: investment.dividendPayFrequency || 'yearly', monthlyRate: investment.monthlyRate || 0, quarterlyRate: investment.quarterlyRate || 0, semiannualRate: investment.semiannualRate || 0, yearlyRate: investment.yearlyRate || 0, dividendPaid: investment.dividendPaid || 0 });
    setShowInvestmentModal(true);
  };

  const reportRange = useMemo(
    () => getReportPeriodRange({ period: reportPeriod, year: reportYear, monthISO: reportMonth }),
    [reportMonth, reportPeriod, reportYear]
  );
  const reportTransactions = useMemo(
    () => filterTransactionsByDateRange(transactions, reportRange.startDate, reportRange.endDate),
    [reportRange.endDate, reportRange.startDate, transactions]
  );
  const reportStats = calculateStats(reportTransactions);

  const stats = calculateStats();
  const getAccountIcon = (type: Account['type']) => {
    const iconProps = { size: 20, className: '' };
    switch (type) {
      case 'bank':
        return <Building {...iconProps} className="text-blue-500" />;
      case 'cash':
        return <Wallet {...iconProps} className="text-swar-primary-light0" />;
      case 'investment':
        return <TrendingUp {...iconProps} className="text-purple-500" />;
      case 'loan':
        return <CreditCard {...iconProps} className="text-red-500" />;
      default:
        return <DollarSign {...iconProps} className="text-swar-text-secondary" />;
    }
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    const iconProps = { size: 16, className: '' };
    if (type === 'income') return <TrendingUp {...iconProps} className="text-swar-primary-light0" />;
    if (type === 'expense') return <TrendingDown {...iconProps} className="text-red-500" />;
    return <DollarSign {...iconProps} className="text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] bg-swar-bg">
        <div className="container mx-auto px-4 flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-swar-bg">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-swar-text mb-2">Accounting</h1>
          <p className="text-swar-text-secondary">Manage your finances, track expenses, and monitor investments</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
          <div className="border-b border-swar-border">
            <nav className="flex space-x-2 sm:space-x-4 md:space-x-8 px-2 sm:px-4 md:px-6 min-w-max">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'accounts', label: 'Accounts', icon: Building },
                { id: 'transactions', label: 'Transactions', icon: DollarSign },
                { id: 'investments', label: 'Investments', icon: Target },
                { id: 'dividend', label: 'Dividends', icon: TrendingUp },
                { id: 'budget', label: 'Budget', icon: PieChart },
                { id: 'reports', label: 'Reports', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-swar-text-secondary hover:text-swar-text hover:border-swar-border'
                  }`}
                >
                  <tab.icon size={20} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div>
            <MyBudgetPanel hideTitle />
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="p-2 bg-swar-primary-light rounded-lg">
                    <TrendingUp className="text-swar-primary" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Total Income</p>
                    <p className="text-2xl font-bold text-swar-text">₹{stats.totalIncome.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="p-2 bg-swar-primary-light rounded-lg">
                    <TrendingDown className="text-red-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Total Expenses</p>
                    <p className="text-2xl font-bold text-swar-text">₹{stats.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="text-blue-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Net Profit</p>
                    <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-swar-primary' : 'text-red-600'}`}>
                      ₹{stats.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="text-purple-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Investments</p>
                    <p className="text-2xl font-bold text-swar-text">₹{stats.totalInvestments.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <PieChart className="text-indigo-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Total Balance</p>
                    <p className="text-2xl font-bold text-swar-text">₹{stats.totalBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dividend Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="text-orange-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Dividends to Be Paid</p>
                    <p className="text-2xl font-bold text-orange-600">₹{calculateDashboardDividends().toBePaid.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-swar-primary">
                <div className="flex items-center">
                  <div className="p-2 bg-swar-primary-light rounded-lg">
                    <DollarSign className="text-swar-primary" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Dividends Paid</p>
                    <p className="text-2xl font-bold text-swar-primary">₹{calculateDashboardDividends().paid.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-swar-text-secondary">Overdue Dividends</p>
                    <p className="text-2xl font-bold text-red-600">₹{calculateDashboardDividends().overdue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-swar-text mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-swar-border rounded-lg">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.type)}
                      <div className="ml-3">
                        <p className="font-medium text-swar-text">{transaction.description}</p>
                        <p className="text-sm text-swar-text-secondary">{transaction.category} • {transaction.account_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-swar-primary' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-swar-text-secondary">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div>
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-swar-border flex justify-between items-center">
                <h3 className="text-lg font-semibold text-swar-text">Accounts</h3>
                <button
                  onClick={() => {
                    resetAccountForm();
                    setEditingAccount(null);
                    setShowAccountModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Plus size={20} className="mr-2" /> Add Account
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <div key={account.id} className="border border-swar-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          {getAccountIcon(account.type)}
                          <span className="ml-2 font-medium text-swar-text">{account.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => handleEditAccount(account)} className="text-blue-600 hover:text-blue-800">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteAccount(account.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-swar-text mb-2">₹{account.balance.toLocaleString()}</p>
                      <p className="text-sm text-swar-text-secondary capitalize">{account.type}</p>
                      {account.accountNumber && <p className="text-sm text-swar-text-secondary">Account: {account.accountNumber}</p>}
                      {account.bankName && <p className="text-sm text-swar-text-secondary">Bank: {account.bankName}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-swar-border flex justify-between items-center">
                <h3 className="text-lg font-semibold text-swar-text">Transactions</h3>
                <button
                  onClick={() => {
                    resetTransactionForm();
                    setEditingTransaction(null);
                    setShowTransactionModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Plus size={20} className="mr-2" /> Add Transaction
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-swar-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.type)} <span className="ml-2 capitalize">{transaction.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-swar-text">{transaction.description}</td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{transaction.category}</td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className={`font-semibold ${transaction.type === 'income' ? 'text-swar-primary' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex space-x-2">
                          <button onClick={() => handleEditTransaction(transaction)} className="text-blue-600 hover:text-blue-900">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteTransaction(transaction.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Investments Tab */}
        {activeTab === 'investments' && (
          <div>
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-swar-border flex justify-between items-center">
                <h3 className="text-lg font-semibold text-swar-text">Investments</h3>
                <button
                  onClick={() => {
                    resetInvestmentForm();
                    setEditingInvestment(null);
                    setShowInvestmentModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Plus size={20} className="mr-2" /> Add Investment
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {investments.map((investment) => (
                    <div key={investment.id} className="border border-swar-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-swar-text">{investment.name}</h4>
                        <div className="flex space-x-2">
                          <button onClick={() => handleEditInvestment(investment)} className="text-blue-600 hover:text-blue-800">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteInvestment(investment.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-swar-text mb-2">₹{investment.amount.toLocaleString()}</p>
                      <div className="space-y-1 text-sm text-swar-text-secondary">
                        <p>
                          Type: <span className="capitalize">{investment.type.replace('_', ' ')}</span>
                        </p>
                        <p>Interest: {investment.interest_rate}%</p>
                        <p>Dividend: {investment.dividend_rate}%</p>
                        <p>
                          Status: <span className="capitalize">{investment.status}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dividend Tab */}
        {activeTab === 'dividend' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-swar-text mb-6">Dividend Management</h2>

              {(() => {
                const divStats = calculateDividends();
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-swar-text-secondary">Total Dividend</p>
                        <p className="text-2xl font-bold text-blue-600">₹{divStats.totalDividend.toLocaleString()}</p>
                      </div>

                      <div className="bg-swar-primary-light p-4 rounded-lg border border-swar-primary">
                        <p className="text-sm text-swar-text-secondary">Dividend Paid</p>
                        <p className="text-2xl font-bold text-swar-primary">₹{divStats.dividendPaid.toLocaleString()}</p>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-sm text-swar-text-secondary">Pending Dividend</p>
                        <p className="text-2xl font-bold text-yellow-600">₹{divStats.dividendPending.toLocaleString()}</p>
                      </div>

                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-sm text-swar-text-secondary">To Be Paid</p>
                        <p className="text-2xl font-bold text-orange-600">₹{divStats.dividendToBePaid.toLocaleString()}</p>
                      </div>

                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="text-sm text-swar-text-secondary">Overdue Dividend</p>
                        <p className="text-2xl font-bold text-red-600">₹{divStats.dividendOverdue.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-swar-text mb-4">Investment Dividends</h3>
                      {divStats.investmentDividends.length === 0 ? (
                        <p className="text-swar-text-secondary">No active investments with dividends</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-swar-bg">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Investment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Dividend Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Frequency</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Accrued</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Paid</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Pending</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Next Payment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-swar-text-secondary uppercase">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-swar-text-secondary uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {divStats.investmentDividends.map((inv, idx) => {
                                const investment = investments.find(i => i.name === inv.name && i.status === 'active' && i.type === 'investment_in');
                                return (
                                  <tr key={idx}>
                                    <td className="px-4 py-3 text-sm font-medium text-swar-text">{inv.name}</td>
                                    <td className="px-4 py-3 text-sm text-swar-text">₹{inv.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-swar-text">{inv.dividendRate}%</td>
                                    <td className="px-4 py-3 text-sm text-swar-text capitalize">{inv.frequency}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{inv.accruedDividend.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-swar-primary">₹{inv.alreadyPaid.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-yellow-600">₹{inv.pending.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-swar-text">{new Date(inv.nextPaymentDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${inv.isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {inv.isOverdue ? 'OVERDUE' : 'PENDING'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                      <div className="flex gap-2 justify-center flex-wrap">
                                        {investment && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setSelectedInvestmentView(investment);
                                                setShowDividendViewModal(true);
                                              }}
                                              className="px-3 py-1 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded text-xs font-semibold flex items-center gap-1"
                                              title="View dividend schedule"
                                            >
                                              <Eye size={14} /> View
                                            </button>
                                            <button
                                              onClick={() => handleEditInvestment(investment)}
                                              className="px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-xs font-semibold"
                                              title="Edit investment details"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedInvestmentView(investment);
                                                setShowDividendViewModal(true);
                                              }}
                                              className="px-3 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded text-xs font-semibold"
                                              title="Record dividend payment"
                                            >
                                              Payment
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-swar-text mb-6">Financial Reports</h2>

              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Report Period</label>
                    <select
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value as ReportPeriodKey)}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="3month">3 Months</option>
                      <option value="6month">6 Months</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {reportPeriod === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-2">Select Month</label>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {reportPeriod === 'yearly' && (
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-2">Select Year</label>
                      <input
                        type="number"
                        value={reportYear}
                        onChange={(e) => setReportYear(parseInt(e.target.value))}
                        min={2020}
                        max={new Date().getFullYear()}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm text-swar-text-secondary">
                  Selected: <span className="font-semibold">{reportRange.label}</span> ({reportRange.startDate} to {reportRange.endDate})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-2 border-swar-border rounded-lg p-6 text-center hover:border-blue-500 hover:shadow-lg transition">
                  <FileText className="mx-auto mb-4 text-blue-600" size={40} />
                  <h3 className="text-lg font-semibold text-swar-text mb-2">Profit & Loss Statement</h3>
                  <p className="text-swar-text-secondary mb-4">Tally-style statement with Debit/Credit columns for the selected period</p>
                  <button
                    onClick={() => generatePDF('pl')}
                    disabled={generatingReport}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" /> Generate Report
                  </button>
                </div>

                <div className="border-2 border-swar-border rounded-lg p-6 text-center hover:border-green-500 hover:shadow-lg transition">
                  <FileText className="mx-auto mb-4 text-swar-primary" size={40} />
                  <h3 className="text-lg font-semibold text-swar-text mb-2">Balance Sheet</h3>
                  <p className="text-swar-text-secondary mb-4">Tally-style Liabilities/Assets statement (uses current balances)</p>
                  <button
                    onClick={() => generatePDF('balancesheet')}
                    disabled={generatingReport}
                    className="w-full bg-swar-primary hover:bg-swar-primary disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" /> Generate Report
                  </button>
                </div>

                <div className="border-2 border-swar-border rounded-lg p-6 text-center hover:border-purple-500 hover:shadow-lg transition">
                  <FileText className="mx-auto mb-4 text-purple-600" size={40} />
                  <h3 className="text-lg font-semibold text-swar-text mb-2">Income & Expense Report</h3>
                  <p className="text-swar-text-secondary mb-4">Tally-style Income/Expense with Debit/Credit columns for the selected period</p>
                  <button
                    onClick={() => generatePDF('income')}
                    disabled={generatingReport}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" /> Generate Report
                  </button>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-swar-text mb-2">Quick Summary — {reportRange.label}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-swar-text-secondary">Total Income</p>
                    <p className="text-lg font-bold text-swar-primary">₹{reportStats.totalIncome.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-swar-text-secondary">Total Expenses</p>
                    <p className="text-lg font-bold text-red-600">₹{reportStats.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-swar-text-secondary">Net Profit</p>
                    <p className={`text-lg font-bold ${reportStats.netProfit >= 0 ? 'text-swar-primary' : 'text-red-600'}`}>
                      ₹{reportStats.netProfit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-swar-text-secondary">Net Worth</p>
                    <p className="text-lg font-bold text-blue-600">₹{reportStats.netWorth.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-swar-text mb-4">{editingAccount ? 'Edit Account' : 'Add New Account'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Account Name</label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter account name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Account Type</label>
                    <select
                      value={accountForm.type}
                      onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as Account['type'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bank">Bank Account</option>
                      <option value="cash">Cash</option>
                      <option value="investment">Investment</option>
                      <option value="loan">Loan</option>
                    </select>
                  </div>
                  {accountForm.type === 'bank' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-1">Account Number</label>
                        <input
                          type="text"
                          value={accountForm.accountNumber}
                          onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                          className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter account number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={accountForm.bankName}
                          onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                          className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter bank name"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Initial Balance</label>
                    <input
                      type="number"
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter initial balance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Link Budget Allocation (Optional)</label>
                    <p className="text-xs text-swar-text mb-2">Do you have a budget allocation for this account?</p>
                    <select
                      value={accountForm.budgetAllocationId || ''}
                      onChange={(e) => setAccountForm({ ...accountForm, budgetAllocationId: e.target.value || null })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Skip for now --</option>
                      {budgetPlan?.allocations && Array.isArray(budgetPlan.allocations) && budgetPlan.allocations.map((alloc: any) => (
                        <option key={alloc.id} value={alloc.id}>
                          {alloc.name} ({alloc.percent}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAccountModal(false);
                      setEditingAccount(null);
                      resetAccountForm();
                    }}
                    className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAccount}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingAccount ? 'Update' : 'Create'} Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-swar-text mb-4">{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as Transaction['type'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Amount</label>
                    <input
                      type="number"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Description</label>
                    <input
                      type="text"
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Category</label>
                    <input
                      type="text"
                      value={transactionForm.category}
                      onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter category"
                    />
                  </div>
                  {(transactionForm.category?.toLowerCase().includes('dividend') || transactionForm.category?.toLowerCase().includes('paid')) && (
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Person/Investment Name</label>
                      <select
                        value={transactionForm.investmentId}
                        onChange={(e) => {
                          const selected = investments.find(inv => inv.id === e.target.value);
                          setTransactionForm({
                            ...transactionForm,
                            investmentId: e.target.value,
                            investmentName: selected?.name || ''
                          });
                        }}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select person/investment</option>
                        {investments.filter(inv => inv.status === 'active' && inv.type === 'investment_in').map((investment) => {
                          const divStats = calculateDividends();
                          const invDiv = divStats.investmentDividends.find(d => d.name === investment.name);
                          const maxAmount = invDiv?.pending || 0;
                          return (
                            <option key={investment.id} value={investment.id}>
                              {investment.name} (Pending: ₹{maxAmount.toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                      {transactionForm.investmentId && (() => {
                        const divStats = calculateDividends();
                        const invDiv = divStats.investmentDividends.find(d => d.name === transactionForm.investmentName);
                        const maxAmount = invDiv?.pending || 0;
                        const isExceeding = transactionForm.amount > maxAmount;
                        return isExceeding ? (
                          <p className="text-xs text-red-600 mt-1">⚠️ Payment exceeds pending amount of ₹{maxAmount.toLocaleString()}</p>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Account</label>
                    <select
                      value={transactionForm.account_id}
                      onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Date</label>
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Payment Mode</label>
                    <select
                      value={transactionForm.mode}
                      onChange={(e) => setTransactionForm({ ...transactionForm, mode: e.target.value as Transaction['mode'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowTransactionModal(false);
                      setEditingTransaction(null);
                      resetTransactionForm();
                    }}
                    className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTransaction}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingTransaction ? 'Update' : 'Create'} Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Investment Modal */}
        {showInvestmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-swar-text mb-4">{editingInvestment ? 'Edit Investment' : 'Add New Investment'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Investment Name</label>
                    <input
                      type="text"
                      value={investmentForm.name}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter investment name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Type</label>
                    <select
                      value={investmentForm.type}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, type: e.target.value as Investment['type'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="investment_in">Investment In</option>
                      <option value="investment_out">Investment Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Amount</label>
                    <input
                      type="number"
                      value={investmentForm.amount}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        value={investmentForm.interest_rate}
                        onChange={(e) => setInvestmentForm({ ...investmentForm, interest_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Dividend Pay Frequency</label>
                      <select
                        value={investmentForm.dividendPayFrequency}
                        onChange={(e) => setInvestmentForm({ ...investmentForm, dividendPayFrequency: e.target.value as Investment['dividendPayFrequency'] })}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly (3 Months)</option>
                        <option value="semiannual">Semi-annual (6 Months)</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">
                      {investmentForm.dividendPayFrequency === 'monthly' && 'Monthly Dividend Rate (%)'}
                      {investmentForm.dividendPayFrequency === 'quarterly' && 'Quarterly Dividend Rate (%)'}
                      {investmentForm.dividendPayFrequency === 'semiannual' && 'Semi-annual Dividend Rate (%)'}
                      {investmentForm.dividendPayFrequency === 'yearly' && 'Yearly Dividend Rate (%)'}
                    </label>
                    <input
                      type="number"
                      value={
                        investmentForm.dividendPayFrequency === 'monthly' ? investmentForm.monthlyRate :
                        investmentForm.dividendPayFrequency === 'quarterly' ? investmentForm.quarterlyRate :
                        investmentForm.dividendPayFrequency === 'semiannual' ? investmentForm.semiannualRate :
                        investmentForm.yearlyRate
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (investmentForm.dividendPayFrequency === 'monthly') {
                          setInvestmentForm({ ...investmentForm, monthlyRate: val });
                        } else if (investmentForm.dividendPayFrequency === 'quarterly') {
                          setInvestmentForm({ ...investmentForm, quarterlyRate: val });
                        } else if (investmentForm.dividendPayFrequency === 'semiannual') {
                          setInvestmentForm({ ...investmentForm, semiannualRate: val });
                        } else {
                          setInvestmentForm({ ...investmentForm, yearlyRate: val });
                        }
                      }}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Amount Received Date</label>
                      <input
                        type="date"
                        value={investmentForm.amountReceivedDate}
                        onChange={(e) => setInvestmentForm({ ...investmentForm, amountReceivedDate: e.target.value })}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Dividend Already Paid (₹)</label>
                      <input
                        type="number"
                        value={investmentForm.dividendPaid}
                        onChange={(e) => setInvestmentForm({ ...investmentForm, dividendPaid: parseFloat(e.target.value) || 0 })}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Repayment Mode</label>
                    <select
                      value={investmentForm.repayment_mode}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, repayment_mode: e.target.value as Investment['repayment_mode'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lumpsum">Lump Sum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Account</label>
                    <select
                      value={investmentForm.account_id}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, account_id: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Status</label>
                    <select
                      value={investmentForm.status}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, status: e.target.value as Investment['status'] })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-1">Next Due Date</label>
                    <input
                      type="date"
                      value={investmentForm.next_due_date}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, next_due_date: e.target.value })}
                      className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="reminder_enabled"
                      checked={investmentForm.reminder_enabled}
                      onChange={(e) => setInvestmentForm({ ...investmentForm, reminder_enabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="reminder_enabled" className="ml-2 block text-sm text-swar-text">
                      Enable reminders
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowInvestmentModal(false);
                      setEditingInvestment(null);
                      resetInvestmentForm();
                    }}
                    className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInvestment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingInvestment ? 'Update' : 'Create'} Investment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dividend View Modal - Two Column Layout */}
        {showDividendViewModal && selectedInvestmentView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="border-b border-swar-border p-6 flex-shrink-0 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-swar-text">Dividend Schedule - {selectedInvestmentView.name}</h2>
                <button
                  onClick={() => {
                    setShowDividendViewModal(false);
                    setSelectedInvestmentView(null);
                    setEditingDividendIndex(null);
                  }}
                  className="text-swar-text-secondary hover:text-swar-text"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Two Column Layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Column - Schedule */}
                <div className="flex-1 overflow-y-auto flex flex-col border-r border-swar-border">
                  <div className="p-6 flex-shrink-0">
                    {/* Investment Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-swar-text-secondary uppercase">Investment Amount</p>
                        <p className="text-xl font-bold text-blue-600">₹{selectedInvestmentView.amount.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-swar-text-secondary uppercase">Amount Received Date</p>
                        <p className="text-lg font-semibold text-green-600">
                          {selectedInvestmentView.amountReceivedDate ? new Date(selectedInvestmentView.amountReceivedDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-xs text-swar-text-secondary uppercase">Dividend Rate</p>
                        <p className="text-xl font-bold text-purple-600">{selectedInvestmentView[`${selectedInvestmentView.dividendPayFrequency}Rate`] || selectedInvestmentView.dividend_rate}%</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-xs text-swar-text-secondary uppercase">Payment Frequency</p>
                        <p className="text-lg font-semibold text-yellow-600 capitalize">{selectedInvestmentView.dividendPayFrequency}</p>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-swar-text mb-4">Dividend Payment Schedule (Next 20 Periods)</h3>
                  </div>

                  {/* Schedule Table */}
                  <div className="flex-1 overflow-x-auto px-6 pb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-swar-bg border-b border-swar-border sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Dividend Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Paid Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Penalty (12% PA)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Total Due</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-swar-text-secondary uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {generateDividendSchedule(selectedInvestmentView).map((schedule, idx) => (
                          <tr
                            key={idx}
                            className={`cursor-pointer transition-colors ${
                              editingDividendIndex === idx ? 'bg-blue-100' :
                              schedule.isOverdue && !schedule.isPaid ? 'bg-red-50 hover:bg-red-100' :
                              schedule.isPaid ? 'bg-green-50 hover:bg-green-100' :
                              'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setEditingDividendIndex(editingDividendIndex === idx ? null : idx);
                              setPaymentForm({
                                paidDate: schedule.paidDate || new Date().toISOString().split('T')[0],
                                paidAmount: schedule.isPaid ? schedule.amount : schedule.amount,
                                paidPenalty: schedule.penalty || 0,
                                giftAmount: 0
                              });
                            }}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-swar-text">
                              {new Date(schedule.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-600">₹{schedule.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              {schedule.isPaid ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold flex items-center gap-1 w-fit">
                                  <Check size={14} /> Paid
                                </span>
                              ) : schedule.isOverdue ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold flex items-center gap-1 w-fit">
                                  <AlertTriangle size={14} /> Overdue ({schedule.daysOverdue} days)
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-swar-text">
                              {schedule.paidDate ? new Date(schedule.paidDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {schedule.penalty > 0 ? (
                                <span className="font-semibold text-orange-600">₹{schedule.penalty.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                              ) : (
                                <span className="text-swar-text-secondary">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-swar-text">₹{schedule.totalDue.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDividendIndex(editingDividendIndex === idx ? null : idx);
                                  setPaymentForm({
                                    paidDate: schedule.paidDate || new Date().toISOString().split('T')[0],
                                    paidAmount: schedule.isPaid ? schedule.amount : schedule.amount,
                                    paidPenalty: schedule.penalty || 0,
                                    giftAmount: 0
                                  });
                                }}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                  editingDividendIndex === idx
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : schedule.isPaid
                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                              >
                                {editingDividendIndex === idx ? 'Close' : (schedule.isPaid ? 'Edit' : 'Add Paid')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Info Box */}
                  <div className="p-6 flex-shrink-0 border-t border-swar-border">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-swar-text-secondary mb-2">
                        <strong>Penalty Calculation:</strong> If a dividend payment is not made by the due date, a penalty of 12% per annum is applied on the unpaid amount.
                      </p>
                      <p className="text-xs text-swar-text-secondary">
                        <strong>Formula:</strong> Penalty = (Dividend Amount × 12% × Days Overdue) / 365
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Payment Form */}
                {editingDividendIndex !== null && (
                  (() => {
                    const schedule = generateDividendSchedule(selectedInvestmentView)[editingDividendIndex];
                    const investment = selectedInvestmentView;
                    const baseDividendAmount = schedule.amount;

                    const dueDate = new Date(schedule.dueDate);
                    const paymentDate = new Date(paymentForm.paidDate);
                    const daysOverdueValue = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    const isLate = paymentDate > dueDate;

                    let calculatedPenalty = 0;
                    if (isLate && daysOverdueValue > 0) {
                      calculatedPenalty = (baseDividendAmount * 12 * daysOverdueValue) / (100 * 365);
                    }

                    const totalDueWithPenalty = baseDividendAmount + calculatedPenalty;

                    return (
                      <div className="w-96 flex flex-col border-l border-swar-border overflow-hidden">
                        <div className="p-6 border-b border-swar-border flex-shrink-0">
                          <h3 className="text-lg font-bold text-swar-text">Record Payment</h3>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                          <div>
                            <p className="text-sm text-swar-text-secondary mb-1">Investment</p>
                            <p className="font-semibold text-swar-text">{investment.name}</p>
                          </div>

                          <div>
                            <p className="text-sm text-swar-text-secondary mb-1">Due Date</p>
                            <p className="font-semibold text-swar-text">{dueDate.toLocaleDateString()}</p>
                          </div>

                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <p className="text-xs text-swar-text-secondary">Base Dividend Amount</p>
                            <p className="text-lg font-bold text-blue-600">₹{baseDividendAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-swar-text mb-2">Paid Date</label>
                            <input
                              type="date"
                              value={paymentForm.paidDate}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                              className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {new Date(paymentForm.paidDate) > dueDate ? (
                              <p className="text-xs text-orange-600 mt-1">⚠️ Payment is {daysOverdueValue} days late</p>
                            ) : (
                              <p className="text-xs text-green-600 mt-1">✓ Payment is on time</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-swar-text mb-2">Paid Amount</label>
                            <input
                              type="number"
                              value={paymentForm.paidAmount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paidAmount: parseFloat(e.target.value) || 0 })}
                              className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-swar-text mb-2">Penalty Amount (12% PA)</label>
                            <input
                              type="number"
                              value={paymentForm.paidPenalty}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paidPenalty: parseFloat(e.target.value) || 0 })}
                              className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                              placeholder="Edit to override calculated penalty"
                            />
                            {calculatedPenalty > 0 && (
                              <p className="text-xs text-orange-600 mt-1">Auto-calculated: ₹{calculatedPenalty.toLocaleString(undefined, {maximumFractionDigits: 2})} ({daysOverdueValue} days late)</p>
                            )}
                            {calculatedPenalty === 0 && (
                              <p className="text-xs text-green-600 mt-1">No penalty - payment on time</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-swar-text mb-2">Gift Amount (Optional)</label>
                            <input
                              type="number"
                              value={paymentForm.giftAmount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, giftAmount: parseFloat(e.target.value) || 0 })}
                              className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-green-500"
                              step="0.01"
                              placeholder="Add any gift amount you want to give"
                            />
                            {paymentForm.giftAmount > 0 && (
                              <p className="text-xs text-green-600 mt-1">🎁 Gift: ₹{paymentForm.giftAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                            )}
                          </div>

                          <div className="bg-swar-primary-light p-3 rounded border border-swar-primary">
                            <p className="text-xs text-swar-text-secondary">Total Amount Due</p>
                            <p className="text-2xl font-bold text-swar-primary">₹{(paymentForm.paidAmount + paymentForm.paidPenalty + paymentForm.giftAmount).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                            <p className="text-xs text-swar-text-secondary mt-2">
                              = Dividend (₹{paymentForm.paidAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}) + Penalty (₹{paymentForm.paidPenalty.toLocaleString(undefined, {maximumFractionDigits: 2})}) + Gift (₹{paymentForm.giftAmount.toLocaleString(undefined, {maximumFractionDigits: 2})})
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-swar-border p-6 flex-shrink-0 flex gap-3">
                          <button
                            onClick={() => {
                              setEditingDividendIndex(null);
                            }}
                            className="flex-1 px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (paymentForm.paidAmount <= 0) {
                                alert('Please enter a valid paid amount');
                                return;
                              }
                              const investmentToUpdate = investments.find(inv => inv.id === selectedInvestmentView!.id);
                              if (!investmentToUpdate) {
                                alert('Investment not found');
                                return;
                              }

                              const isEditing = !!schedule.transactionId;
                              let updatedTransactions = [...transactions];
                              const totalPaid = paymentForm.paidAmount + paymentForm.paidPenalty + paymentForm.giftAmount;

                              if (isEditing) {
                                updatedTransactions = transactions.map(t =>
                                  t.id === schedule.transactionId
                                    ? {
                                        ...t,
                                        amount: totalPaid,
                                        date: paymentForm.paidDate,
                                        description: `Dividend payment - ${investment.name}${paymentForm.paidPenalty > 0 ? ` (₹${paymentForm.paidPenalty.toLocaleString(undefined, {maximumFractionDigits: 2})} penalty)` : ''}${paymentForm.giftAmount > 0 ? ` + ₹${paymentForm.giftAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} gift` : ''}`
                                      }
                                    : t
                                );
                              } else {
                                const newTransaction: Transaction = {
                                  id: `trans_${Date.now()}`,
                                  type: 'expense',
                                  amount: totalPaid,
                                  description: `Dividend payment - ${investment.name}${paymentForm.paidPenalty > 0 ? ` (₹${paymentForm.paidPenalty.toLocaleString(undefined, {maximumFractionDigits: 2})} penalty)` : ''}${paymentForm.giftAmount > 0 ? ` + ₹${paymentForm.giftAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} gift` : ''}`,
                                  category: 'dividend_payment',
                                  account_id: '',
                                  account_name: '',
                                  date: paymentForm.paidDate,
                                  mode: 'bank',
                                  investmentId: selectedInvestmentView!.id,
                                  investmentName: investment.name,
                                  created_at: new Date().toISOString()
                                };
                                updatedTransactions = [...transactions, newTransaction];
                              }

                              const newDividendPaid = (investmentToUpdate.dividendPaid || 0) + (isEditing ? 0 : paymentForm.paidAmount);
                              const updatedInvestment = { ...investmentToUpdate, dividendPaid: newDividendPaid };
                              const updatedInvestments = investments.map(inv => inv.id === selectedInvestmentView!.id ? updatedInvestment : inv);

                              saveAccountingData(accounts, updatedTransactions, updatedInvestments, budgetPlan).then(success => {
                                if (success) {
                                  setInvestments(updatedInvestments);
                                  setTransactions(updatedTransactions);
                                  if (selectedInvestmentView?.id === selectedInvestmentView!.id) {
                                    setSelectedInvestmentView(updatedInvestment);
                                  }
                                  setEditingDividendIndex(null);
                                  const action = isEditing ? 'updated' : 'recorded';
                                  alert(`Total payment of ₹${totalPaid.toLocaleString(undefined, {maximumFractionDigits: 2})} ${action}${paymentForm.paidPenalty > 0 ? ` (with ₹${paymentForm.paidPenalty.toLocaleString(undefined, {maximumFractionDigits: 2})} penalty)` : ''}${paymentForm.giftAmount > 0 ? ` + ₹${paymentForm.giftAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} gift` : ''} for ${paymentForm.paidDate}`);
                                } else {
                                  alert(`Failed to ${isEditing ? 'update' : 'record'} payment`);
                                }
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            {schedule.transactionId ? 'Update Payment' : 'Record Payment'}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-swar-border p-6 flex-shrink-0 flex justify-end">
                <button
                  onClick={() => {
                    setShowDividendViewModal(false);
                    setSelectedInvestmentView(null);
                    setEditingDividendIndex(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
