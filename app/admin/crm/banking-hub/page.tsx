'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import {
  Landmark,
  DollarSign,
  Receipt,
  BookOpen,
  Calculator,
  TrendingUp,
  BarChart3,
  Wallet,
  ArrowRight,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';

type BankingTabKey = 'all' | 'banking' | 'tally' | 'investments';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  category: 'banking' | 'tally' | 'investments';
}

const bankingPages: PageCard[] = [
  // ── 1. Bank & Accounting ──
  {
    label: 'Bank Income Tracker',
    description: 'Upload PDF bank statements, automatic party name detection, transaction classification, and income reports.',
    href: '/admin/crm/bank-income',
    icon: Landmark,
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Bank Statements',
    category: 'banking',
  },
  {
    label: 'Master Accounting & P&L',
    description: 'Full financial accounting system, chart of accounts, P&L statements, balance sheets, and journal vouchers.',
    href: '/admin/accounting',
    icon: DollarSign,
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Financial P&L',
    category: 'banking',
  },
  {
    label: 'CRM Account Manager',
    description: 'Internal CRM accounts, transactions, daily income records, and real-time ledger entries.',
    href: '/admin/crm/account',
    icon: Receipt,
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'CRM Ledgers',
    category: 'banking',
  },
  {
    label: 'Account Book & Cash Journal',
    description: 'Daily cash register, petty cash entries, receipt books, and payment journal.',
    href: '/admin/crm/account-book',
    icon: BookOpen,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'Cash Book',
    category: 'banking',
  },
  {
    label: 'Planner Accounting',
    description: 'Personal Sadhana finance tracker, seasonal Ayurvedic budgeting, and personal wealth planner.',
    href: '/admin/crm/planner-dashboard/accounting',
    icon: Wallet,
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'Planner Budget',
    category: 'banking',
  },

  // ── 2. Tally & ERP ──
  {
    label: 'Tally Synchronization',
    description: 'Sync CRM transactions, sales vouchers, student fees, and invoices directly into Tally Prime / ERP.',
    href: '/admin/crm/tally',
    icon: Calculator,
    gradient: 'from-purple-500 to-pink-600',
    badge: 'Tally ERP',
    category: 'tally',
  },

  // ── 3. Investments & Portfolio ──
  {
    label: 'Investment Portfolio',
    description: 'Track organization investments, mutual funds, gold holdings, fixed deposits, and equities.',
    href: '/admin/crm/investment',
    icon: TrendingUp,
    gradient: 'from-emerald-600 to-green-600',
    badge: 'Portfolio',
    category: 'investments',
  },
  {
    label: 'Investment Analytics Dashboard',
    description: 'Portfolio growth charts, return on investment (ROI), asset allocation metrics, and risk analytics.',
    href: '/admin/crm/investment-dashboard',
    icon: BarChart3,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'ROI Analytics',
    category: 'investments',
  },
];

const tabFilters: { key: BankingTabKey; label: string; count: (list: PageCard[]) => number }[] = [
  { key: 'all', label: 'All Modules', count: (l) => l.length },
  { key: 'banking', label: 'Bank & Accounting', count: (l) => l.filter(p => p.category === 'banking').length },
  { key: 'tally', label: 'Tally Sync', count: (l) => l.filter(p => p.category === 'tally').length },
  { key: 'investments', label: 'Investments & Portfolio', count: (l) => l.filter(p => p.category === 'investments').length },
];

function BankingHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<BankingTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || localStorage.getItem('crm_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    try {
      jwtDecode(token);
      setIsAuthenticated(true);
    } catch {
      router.push(getLoginPath());
    }
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab') as BankingTabKey;
    if (tab && ['all', 'banking', 'tally', 'investments'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: BankingTabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/banking-hub${tab === 'all' ? '' : `?tab=${tab}`}`);
  };

  const filteredCards = bankingPages.filter((card) => {
    const matchesTab = activeTab === 'all' || card.category === activeTab;
    const matchesSearch =
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Landmark className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Banking & Finance</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Accounts & Ledgers
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Central hub for bank statements, financial ledgers, Tally synchronization, cash books, and investment portfolio management.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search banking modules..."
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {tabFilters.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.count(bankingPages);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-500/80 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center text-white shadow-md shadow-gray-200 group-hover:scale-105 transition-transform duration-200`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {card.badge && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-md">
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                  {card.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600" />
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open module</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-sm">No banking modules found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 shadow-xs">
        <div>
          Showing <strong>{filteredCards.length}</strong> modules in{' '}
          <strong>{tabFilters.find((t) => t.key === activeTab)?.label}</strong>
        </div>
        <div className="text-gray-400">Total: {bankingPages.length} Banking & Finance Modules</div>
      </div>
    </div>
  );
}

export default function BankingHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <BankingHubContent />
    </Suspense>
  );
}
