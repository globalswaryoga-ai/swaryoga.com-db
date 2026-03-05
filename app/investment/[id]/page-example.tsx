/**
 * Example: Investment Detail Page with Certificate Download
 * Shows how to integrate the certificate system into your dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import CertificateDownload from '@/components/admin/CertificateDownload';
import { ENTITIES, ENTITY_NAMES, SHARE_TYPES, THEME_COLORS } from '@/lib/investment-constants';
import { formatCurrency, formatDate, calculateYears } from '@/lib/investment-utils';

interface Investment {
  _id: string;
  userId: string;
  entity: string;
  amount: number;
  startDate: string;
  endDate: string;
  interestRate: number;
  shareType?: string;
  numberOfShares?: number;
  sharePrice?: number;
  status: string;
  certificateNumber: string;
  maturityAmount?: number;
  compound?: boolean;
  createdAt: string;
}

export default function InvestmentDetailExample() {
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example: Fetch investment data
    // const investmentId = params.id;
    // const response = await fetch(`/api/investment/${investmentId}`);
    // const data = await response.json();
    // setInvestment(data);
    
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!investment) {
    return <div className="p-8 text-center">Investment not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: THEME_COLORS.BLUE }}>
            📈 Investment Details
          </h1>
          <p className="text-gray-600">
            Manage and download your investment certificate and receipt
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Investment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Investment Summary Card */}
            <div className="bg-white p-8 rounded-lg shadow-lg border-t-4" style={{ borderTopColor: THEME_COLORS.BLUE }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: THEME_COLORS.BLUE }}>
                    {investment.entity === ENTITIES.SWAR_SAKSHI
                      ? '🏛️ Swar Sakshi Proprietorship'
                      : '🏢 Upamanyu Private Limited'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Certificate: {investment.certificateNumber}
                  </p>
                </div>

                <span
                  className={`px-4 py-2 rounded-full font-semibold text-white ${
                    investment.status === 'ACTIVE'
                      ? 'bg-green-500'
                      : investment.status === 'PENDING'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                >
                  {investment.status}
                </span>
              </div>

              {/* Amount Display */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Investment Amount</p>
                  <p className="text-2xl font-bold" style={{ color: THEME_COLORS.GREEN }}>
                    {formatCurrency(investment.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    {investment.entity === ENTITIES.SWAR_SAKSHI ? 'Interest Rate' : 'Annual Return'}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: THEME_COLORS.ORANGE }}>
                    {investment.entity === ENTITIES.SWAR_SAKSHI
                      ? `${investment.interestRate}%`
                      : investment.shareType === SHARE_TYPES.PREFERENCE
                      ? '12%'
                      : '10%+'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    {investment.entity === ENTITIES.SWAR_SAKSHI ? 'Maturity Amount' : 'Total Value'}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: THEME_COLORS.GREEN }}>
                    {formatCurrency(investment.maturityAmount || investment.amount)}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Start Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(investment.startDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">End Date / Maturity</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(investment.endDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {calculateYears(new Date(investment.startDate), new Date(investment.endDate))} years
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Interest Type</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {investment.entity === ENTITIES.SWAR_SAKSHI
                      ? investment.compound
                        ? 'Compound'
                        : 'Simple'
                      : 'Annual Dividend'}
                  </p>
                </div>
              </div>

              {/* Share Details (for Upamanyu) */}
              {investment.entity === ENTITIES.UPAMANYU && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Share Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Share Type</p>
                      <p className="font-semibold text-gray-900">
                        {investment.shareType === SHARE_TYPES.PREFERENCE ? 'Preference' : 'Equity'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Number of Shares</p>
                      <p className="font-semibold text-gray-900">
                        {investment.numberOfShares || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Share Price</p>
                      <p className="font-semibold text-gray-900">
                        {investment.sharePrice ? formatCurrency(investment.sharePrice) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Return Type</p>
                      <p className="font-semibold text-gray-900">
                        {investment.shareType === SHARE_TYPES.PREFERENCE
                          ? 'Fixed 12%'
                          : 'Variable'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold mb-6" style={{ color: THEME_COLORS.BLUE }}>
                📅 Timeline
              </h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: THEME_COLORS.GREEN }}
                    ></div>
                    <div className="w-1 h-16 bg-gray-300"></div>
                  </div>
                  <div>
                    <p className="font-semibold">Investment Started</p>
                    <p className="text-sm text-gray-600">{formatDate(investment.startDate)}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: THEME_COLORS.ORANGE }}
                    ></div>
                    <div className="w-1 h-16 bg-gray-300"></div>
                  </div>
                  <div>
                    <p className="font-semibold">Current Status</p>
                    <p className="text-sm text-gray-600">
                      Active - {calculateYears(new Date(investment.startDate), new Date())} year(s) in
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: THEME_COLORS.BLUE }}
                    ></div>
                  </div>
                  <div>
                    <p className="font-semibold">Maturity Date</p>
                    <p className="text-sm text-gray-600">{formatDate(investment.endDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Certificate Download Component */}
            <CertificateDownload
              investmentId={investment._id}
              certificateNumber={investment.certificateNumber}
              status={investment.status}
              onDownload={() => {
                console.log('Certificate downloaded successfully');
              }}
            />

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold mb-4" style={{ color: THEME_COLORS.ORANGE }}>
                ⚡ Quick Actions
              </h3>

              <div className="space-y-3">
                <button className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                  📧 Email Certificate
                </button>

                <button className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium">
                  💬 Share on WhatsApp
                </button>

                <button className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  📋 View Statement
                </button>

                <button className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  📞 Contact Support
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <h3 className="text-sm font-bold text-blue-900 mb-3">✓ What You Get</h3>
              <ul className="text-xs text-blue-800 space-y-2">
                <li>✓ Investment Certificate</li>
                <li>✓ Payment Receipt</li>
                <li>✓ Company Branding</li>
                <li>✓ Admin Authorization</li>
                <li>✓ KYC Verification</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <h3 className="text-sm font-bold text-green-900 mb-3">📊 Your Benefits</h3>
              <ul className="text-xs text-green-800 space-y-2">
                <li>💰 {investment.entity === ENTITIES.SWAR_SAKSHI ? 'Fixed Income' : 'Dividend Income'}</li>
                <li>🛡️ Safe & Secure</li>
                <li>📈 Transparent</li>
                <li>⏰ Flexible Duration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
