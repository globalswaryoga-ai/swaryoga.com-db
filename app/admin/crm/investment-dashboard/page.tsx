/**
 * Investment Dashboard & Manager
 * - Total investments in both farms (Swar Sakshi & Upamanyu)
 * - This month maturity payments
 * - Face value and premium value display
 * - Comprehensive investment analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/investment-utils';
import { ENTITIES, ENTITY_NAMES } from '@/lib/investment-constants';

interface Investment {
  _id: string;
  entity: 'swar-sakshi' | 'upamanyu';
  name: string;
  phone: string;
  amount: number;
  numberOfShares?: number;
  sharePrice?: number;
  interestRate?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'matured' | 'overdue';
  certificateNumber: string;
  maturityAmount?: number;
  paidDividend?: number;
  pendingDividend?: number;
  createdAt: string;
}

interface SharePrices {
  faceValue: number;
  premiumValue: number;
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
  overallMaturityPayments: number;
  pendingDividends: number;
}

export default function InvestmentDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvestments: 0,
    totalAmount: 0,
    swarsakhiTotal: 0,
    upamanyuTotal: 0,
    swarsakhiInvestors: 0,
    upamanyuInvestors: 0,
    thisMonthMaturity: 0,
    thisMonthMaturityCount: 0,
    overallMaturityPayments: 0,
    pendingDividends: 0,
  });
  const [sharePrices, setSharePrices] = useState<SharePrices>({
    faceValue: 10, // 1 share = 10 RS (fixed)
    premiumValue: 0, // Admin will set this
  });
  const [editingPremium, setEditingPremium] = useState(false);
  const [premiumInput, setPremiumInput] = useState('0');
  const [thisMonthMaturityInvestments, setThisMonthMaturityInvestments] = useState<Investment[]>([]);

  // Fetch investments
  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const response = await fetch('/api/admin/crm/investments');
        if (response.ok) {
          const data = await response.json();
          const invList = data.investments || [];
          setInvestments(invList);
          calculateStats(invList);
        }
      } catch (error) {
        console.error('Failed to fetch investments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, []);

  // Load share prices from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sharePrices');
    if (saved) {
      const prices = JSON.parse(saved);
      setSharePrices(prices);
      setPremiumInput(prices.premiumValue.toString());
    }
  }, []);

  const calculateStats = (invList: Investment[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalInvestments = 0;
    let totalAmount = 0;
    let swarsakhiTotal = 0;
    let upamanyuTotal = 0;
    let swarsakhiInvestors = new Set<string>();
    let upamanyuInvestors = new Set<string>();
    let thisMonthMaturity = 0;
    let thisMonthMaturityCount = 0;
    let overallMaturityPayments = 0;
    let pendingDividends = 0;
    let monthlyMaturityInv: Investment[] = [];

    invList.forEach((inv) => {
      totalInvestments++;
      totalAmount += inv.amount;
      pendingDividends += inv.pendingDividend || 0;

      // Track by entity
      if (inv.entity === 'swar-sakshi') {
        swarsakhiTotal += inv.amount;
        swarsakhiInvestors.add(inv.phone);
      } else if (inv.entity === 'upamanyu') {
        upamanyuTotal += inv.amount;
        upamanyuInvestors.add(inv.phone);
      }

      // Check for this month's maturity
      const endDate = new Date(inv.endDate);
      if (
        endDate.getMonth() === currentMonth &&
        endDate.getFullYear() === currentYear
      ) {
        thisMonthMaturity += inv.maturityAmount || inv.amount;
        thisMonthMaturityCount++;
        monthlyMaturityInv.push(inv);
      }

      // Overall maturity amounts (for all matured investments)
      if (inv.status === 'matured' || inv.status === 'overdue') {
        overallMaturityPayments += inv.maturityAmount || inv.amount;
      }
    });

    setStats({
      totalInvestments,
      totalAmount,
      swarsakhiTotal,
      upamanyuTotal,
      swarsakhiInvestors: swarsakhiInvestors.size,
      upamanyuInvestors: upamanyuInvestors.size,
      thisMonthMaturity,
      thisMonthMaturityCount,
      overallMaturityPayments,
      pendingDividends,
    });

    setThisMonthMaturityInvestments(monthlyMaturityInv.sort((a, b) => 
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    ));
  };

  const handleSavePremiumValue = () => {
    const newPremium = parseFloat(premiumInput) || 0;
    const updatedPrices = { ...sharePrices, premiumValue: newPremium };
    setSharePrices(updatedPrices);
    localStorage.setItem('sharePrices', JSON.stringify(updatedPrices));
    setEditingPremium(false);
  };

  const calculateTotalShares = () => {
    return investments.reduce((total, inv) => {
      if (inv.entity === 'upamanyu' && inv.numberOfShares) {
        return total + inv.numberOfShares;
      }
      return total;
    }, 0);
  };

  const totalShares = calculateTotalShares();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Investment Dashboard</h1>
          <p className="text-gray-600 text-lg">Comprehensive overview of all investments across farms</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Loading investment data...</div>
          </div>
        ) : (
          <>
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Investments */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold uppercase">Total Investments</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalInvestments}</p>
                  </div>
                  <div className="text-5xl opacity-20">📈</div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold uppercase">Total Amount</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <div className="text-5xl opacity-20">💰</div>
                </div>
              </div>

              {/* This Month Maturity */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold uppercase">This Month Maturity</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(stats.thisMonthMaturity)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.thisMonthMaturityCount} investments</p>
                  </div>
                  <div className="text-5xl opacity-20">📅</div>
                </div>
              </div>

              {/* Pending Dividends */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold uppercase">Pending Dividends</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(stats.pendingDividends)}</p>
                  </div>
                  <div className="text-5xl opacity-20">⏳</div>
                </div>
              </div>
            </div>

            {/* Share Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Face Value Card */}
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-xl p-8 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-purple-100 font-semibold text-sm uppercase tracking-wide">Face Value Per Share</p>
                    <p className="text-5xl font-bold mt-3">₹{sharePrices.faceValue}</p>
                  </div>
                  <div className="text-6xl opacity-30">📊</div>
                </div>

                <div className="border-t border-purple-300 border-opacity-30 pt-4 mt-4">
                  <p className="text-purple-100 text-sm">Total Shares (Upamanyu)</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalShares.toLocaleString()}</p>
                  <p className="text-purple-100 text-xs mt-2">
                    Total Face Value: <span className="font-bold">{formatCurrency(totalShares * sharePrices.faceValue)}</span>
                  </p>
                </div>

                <div className="bg-purple-600 bg-opacity-40 rounded-lg p-3 mt-4">
                  <p className="text-xs text-purple-100">Fixed Value (Cannot be changed)</p>
                </div>
              </div>

              {/* Premium Value Card */}
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-xl p-8 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-teal-100 font-semibold text-sm uppercase tracking-wide">Premium Value Per Share</p>
                    <p className="text-5xl font-bold mt-3">₹{sharePrices.premiumValue.toFixed(2)}</p>
                  </div>
                  <div className="text-6xl opacity-30">💎</div>
                </div>

                <div className="border-t border-teal-300 border-opacity-30 pt-4 mt-4">
                  <p className="text-teal-100 text-sm">Total Shares (Upamanyu)</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalShares.toLocaleString()}</p>
                  <p className="text-teal-100 text-xs mt-2">
                    Total Premium Value: <span className="font-bold">{formatCurrency(totalShares * sharePrices.premiumValue)}</span>
                  </p>
                </div>

                {editingPremium ? (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={premiumInput}
                      onChange={(e) => setPremiumInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-teal-600 bg-opacity-50 rounded text-white border border-teal-300 focus:outline-none"
                      placeholder="Enter premium value"
                    />
                    <button
                      onClick={handleSavePremiumValue}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 rounded font-semibold transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingPremium(true)}
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700 rounded-lg py-2 font-semibold text-sm transition-colors"
                  >
                    Edit Premium Value (Admin)
                  </button>
                )}
              </div>
            </div>

            {/* Investment Breakdown by Entity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Swar Sakshi */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">🌾 Swar Sakshi</h3>
                  <p className="text-green-100">12% Fixed Dividend Investment</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="border-b pb-4">
                    <p className="text-gray-600 text-sm font-semibold uppercase">Total Investment</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.swarsakhiTotal)}</p>
                  </div>

                  <div className="border-b pb-4">
                    <p className="text-gray-600 text-sm font-semibold uppercase">Number of Investors</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.swarsakhiInvestors}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase mb-2">Average Investment Per Person</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.swarsakhiInvestors > 0
                        ? formatCurrency(stats.swarsakhiTotal / stats.swarsakhiInvestors)
                        : '₹0'}
                    </p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase mb-2">Expected Annual Dividend (12%)</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(stats.swarsakhiTotal * 0.12)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upamanyu */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">👑 Upamanyu</h3>
                  <p className="text-purple-100">Equity & Preference Shares</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="border-b pb-4">
                    <p className="text-gray-600 text-sm font-semibold uppercase">Total Investment</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{formatCurrency(stats.upamanyuTotal)}</p>
                  </div>

                  <div className="border-b pb-4">
                    <p className="text-gray-600 text-sm font-semibold uppercase">Number of Investors</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.upamanyuInvestors}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase mb-2">Total Shares Issued</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {totalShares.toLocaleString()} shares
                    </p>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase mb-2">Average Investment Per Person</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {stats.upamanyuInvestors > 0
                        ? formatCurrency(stats.upamanyuTotal / stats.upamanyuInvestors)
                        : '₹0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* This Month Maturity Payments */}
            {thisMonthMaturityInvestments.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">📅 This Month's Maturity Payments</h3>
                  <p className="text-orange-100">{thisMonthMaturityInvestments.length} investments maturing this month</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Investor Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Maturity Amount</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Maturity Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {thisMonthMaturityInvestments.map((inv) => (
                        <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.name}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {inv.entity === 'swar-sakshi' ? 'Swar Sakshi' : 'Upamanyu'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(inv.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                            {formatCurrency(inv.maturityAmount || inv.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900">
                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
                              {formatDate(inv.endDate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bg-orange-50 p-6 border-t-2 border-orange-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-gray-600 text-sm font-semibold uppercase">Total Investments</p>
                        <p className="text-2xl font-bold text-orange-600 mt-2">
                          {formatCurrency(
                            thisMonthMaturityInvestments.reduce((sum, inv) => sum + inv.amount, 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm font-semibold uppercase">Total Maturity</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                          {formatCurrency(
                            thisMonthMaturityInvestments.reduce((sum, inv) => sum + (inv.maturityAmount || inv.amount), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm font-semibold uppercase">Total Returns</p>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          {formatCurrency(
                            thisMonthMaturityInvestments.reduce(
                              (sum, inv) => sum + ((inv.maturityAmount || inv.amount) - inv.amount),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Investments */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm font-semibold uppercase mb-2">Active Investments</p>
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  {investments.filter((inv) => inv.status === 'active').length}
                </p>
                <p className="text-gray-500 text-sm">
                  {formatCurrency(
                    investments
                      .filter((inv) => inv.status === 'active')
                      .reduce((sum, inv) => sum + inv.amount, 0)
                  )}{' '}
                  invested
                </p>
              </div>

              {/* Matured Investments */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-semibold uppercase mb-2">Matured Investments</p>
                <p className="text-4xl font-bold text-green-600 mb-2">
                  {investments.filter((inv) => inv.status === 'matured').length}
                </p>
                <p className="text-gray-500 text-sm">
                  {formatCurrency(
                    investments
                      .filter((inv) => inv.status === 'matured')
                      .reduce((sum, inv) => sum + (inv.maturityAmount || inv.amount), 0)
                  )}{' '}
                  to be paid
                </p>
              </div>

              {/* Overdue Investments */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <p className="text-gray-600 text-sm font-semibold uppercase mb-2">Overdue Investments</p>
                <p className="text-4xl font-bold text-red-600 mb-2">
                  {investments.filter((inv) => inv.status === 'overdue').length}
                </p>
                <p className="text-gray-500 text-sm">
                  {formatCurrency(
                    investments
                      .filter((inv) => inv.status === 'overdue')
                      .reduce((sum, inv) => sum + (inv.maturityAmount || inv.amount), 0)
                  )}{' '}
                  overdue
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
