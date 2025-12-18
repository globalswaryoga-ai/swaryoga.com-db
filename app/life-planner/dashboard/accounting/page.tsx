'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Target
} from 'lucide-react';
import { filterTransactionsByDateRange, getReportPeriodRange, type ReportPeriodKey } from '@/lib/accountingReportPeriod';

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
  created_at: string;
}

export default function LifePlannerAccountingPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'investments' | 'reports'>('dashboard');
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

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('lifePlannerToken') : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as Account['type'],
    accountNumber: '',
    bankName: '',
    balance: 0
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as Transaction['type'],
    amount: 0,
    description: '',
    category: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'cash' as Transaction['mode']
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
    status: 'active' as Investment['status']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [accountsRes, transactionsRes, investmentsRes] = await Promise.all([
        fetch('/api/accounting/accounts', { headers }),
        fetch('/api/accounting/transactions', { headers }),
        fetch('/api/accounting/investments', { headers })
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.data || []);
      } else {
        console.error('Failed to fetch accounts');
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.data || []);
      } else {
        console.error('Failed to fetch transactions');
      }

      if (investmentsRes.ok) {
        const investmentsData = await investmentsRes.json();
        setInvestments(investmentsData.data || []);
      } else {
        console.error('Failed to fetch investments');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const method = editingAccount ? 'PUT' : 'POST';
      const url = editingAccount ? `/api/accounting/accounts?id=${editingAccount.id}` : '/api/accounting/accounts';

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      });

      if (response.ok) {
        const result = await response.json();
        if (editingAccount) {
          setAccounts(accounts.map(acc => acc.id === editingAccount.id ? result.data : acc));
        } else {
          setAccounts([...accounts, result.data]);
        }
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
        const response = await fetch(`/api/accounting/accounts?id=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setAccounts(accounts.filter(acc => acc.id !== id));
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
      const method = editingTransaction ? 'PUT' : 'POST';
      const url = editingTransaction ? `/api/accounting/transactions?id=${editingTransaction.id}` : '/api/accounting/transactions';

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          account_name: selectedAccount.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (editingTransaction) {
          setTransactions(transactions.map(t => t.id === editingTransaction.id ? result.data : t));
        } else {
          setTransactions([...transactions, result.data]);
        }
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
        const response = await fetch(`/api/accounting/transactions?id=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setTransactions(transactions.filter(t => t.id !== id));
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
      const method = editingInvestment ? 'PUT' : 'POST';
      const url = editingInvestment ? `/api/accounting/investments?id=${editingInvestment.id}` : '/api/accounting/investments';

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...investmentForm,
          account_name: selectedAccount.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (editingInvestment) {
          setInvestments(investments.map(inv => inv.id === editingInvestment.id ? result.data : inv));
        } else {
          setInvestments([...investments, result.data]);
        }
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
        const response = await fetch(`/api/accounting/investments?id=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setInvestments(investments.filter(inv => inv.id !== id));
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
    setAccountForm({ name: '', type: 'bank', accountNumber: '', bankName: '', balance: 0 });
  };

  const resetTransactionForm = () => {
    setTransactionForm({ type: 'income', amount: 0, description: '', category: '', account_id: '', date: new Date().toISOString().split('T')[0], mode: 'cash' });
  };

  const resetInvestmentForm = () => {
    setInvestmentForm({ name: '', type: 'investment_in', amount: 0, interest_rate: 0, dividend_rate: 0, repayment_mode: 'monthly', reminder_enabled: true, next_due_date: '', account_id: '', status: 'active' });
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountForm({ name: account.name, type: account.type, accountNumber: account.accountNumber || '', bankName: account.bankName || '', balance: account.balance });
    setShowAccountModal(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({ type: transaction.type, amount: transaction.amount, description: transaction.description, category: transaction.category, account_id: transaction.account_id, date: transaction.date, mode: transaction.mode });
    setShowTransactionModal(true);
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setInvestmentForm({ name: investment.name, type: investment.type, amount: investment.amount, interest_rate: investment.interest_rate, dividend_rate: investment.dividend_rate, repayment_mode: investment.repayment_mode, reminder_enabled: investment.reminder_enabled, next_due_date: investment.next_due_date || '', account_id: investment.account_id, status: investment.status });
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
            <nav className="flex space-x-8 px-6 min-w-max">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'accounts', label: 'Accounts', icon: Building },
                { id: 'transactions', label: 'Transactions', icon: DollarSign },
                { id: 'investments', label: 'Investments', icon: Target },
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
                  <div className="p-2 bg-red-100 rounded-lg">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.type)} <span className="ml-2 capitalize">{transaction.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-swar-text">{transaction.description}</td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{transaction.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-swar-text mb-1">Dividend Rate (%)</label>
                      <input
                        type="number"
                        value={investmentForm.dividend_rate}
                        onChange={(e) => setInvestmentForm({ ...investmentForm, dividend_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full p-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
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
      </div>
    </div>
  );
}
