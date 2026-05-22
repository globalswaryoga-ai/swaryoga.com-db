'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTrialCheck } from '@/hooks/useTrialCheck';

export default function ProfilePage() {
  const token = useAuth();
  const { trialStatus, loading } = useTrialCheck(token);
  const [copying, setCopying] = useState<string | null>(null);

  if (token === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(id);
      setTimeout(() => setCopying(null), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const trial = trialStatus?.trial;
  const isTrialExpired = trial && trial.daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/crm"
              className="text-gray-500 hover:text-gray-700 transition-all hover:-translate-x-1 flex items-center gap-1"
            >
              <span>←</span> <span className="hidden sm:inline">Back to CRM</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              👤 My Profile
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Trial Status Banner */}
        {trialStatus?.hasActiveTrial && (
          <div className={`rounded-2xl border-2 p-6 ${
            isTrialExpired
              ? 'bg-red-50 border-red-200'
              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`font-bold text-lg mb-1 ${
                  isTrialExpired ? 'text-red-900' : 'text-green-900'
                }`}>
                  {isTrialExpired ? '⏰ Trial Expired' : '🎉 Free Trial Active'}
                </h3>
                {trial && (
                  <div className={`text-sm space-y-1 ${
                    isTrialExpired ? 'text-red-700' : 'text-green-700'
                  }`}>
                    <p>Day {trial.daysSinceStart} of 15</p>
                    {!isTrialExpired && (
                      <>
                        <p>{trial.daysRemaining} days remaining</p>
                        <p className="text-xs opacity-75">
                          Started: {new Date(trial.trialStartDate).toLocaleDateString('en-IN')}
                        </p>
                      </>
                    )}
                    {isTrialExpired && (
                      <p className="text-xs opacity-75">
                        Ended: {new Date(trial.trialEndDate).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {!isTrialExpired && (
                <Link
                  href="/crm-site/pricing"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  🚀 Upgrade Plan
                </Link>
              )}
              {isTrialExpired && (
                <Link
                  href="/crm-site/pricing"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  🚀 Upgrade Now
                </Link>
              )}
            </div>

            {/* Trial Progress Bar */}
            {trial && !isTrialExpired && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-green-900">Trial Progress</span>
                  <span className="text-green-700">{Math.round((trial.daysSinceStart / 15) * 100)}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${(trial.daysSinceStart / 15) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-xl border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📧 Account Information
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 font-medium mb-1">Email Address</p>
              <p className="font-mono text-gray-800 break-all">{token}</p>
            </div>
          </div>
        </div>

        {/* Connected QR */}
        {trial?.qrWhatsAppNumber && (
          <div className="bg-white rounded-2xl shadow-xl border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              💬 Connected WhatsApp
            </h2>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-2">QR WhatsApp Number</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xl text-green-900">{trial.qrWhatsAppNumber}</p>
                <button
                  onClick={() => handleCopy(trial.qrWhatsAppNumber || '', 'qr')}
                  className="px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium text-sm transition-colors"
                >
                  {copying === 'qr' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Scanned on {trial.trialStartDate ? new Date(trial.trialStartDate).toLocaleDateString('en-IN') : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Plan Details */}
        <div className="bg-white rounded-2xl shadow-xl border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 Current Plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-xs text-indigo-600 font-medium mb-1">Plan Type</p>
              <p className="text-lg font-bold text-indigo-900">Basic Plan</p>
              <p className="text-xs text-indigo-700 mt-1">Free Trial</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-xs text-purple-600 font-medium mb-1">Contacts Limit</p>
              <p className="text-lg font-bold text-purple-900">500</p>
              <p className="text-xs text-purple-700 mt-1">Unlimited conversations</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-600 font-medium mb-1">Storage</p>
              <p className="text-lg font-bold text-blue-900">
                {trial?.storagePaymentPaid ? '1GB' : '100MB'}
              </p>
              <p className="text-xs text-blue-700 mt-1">Monthly storage</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs text-green-600 font-medium mb-1">Price</p>
              <p className="text-lg font-bold text-green-900">₹499<span className="text-xs">/month</span></p>
              <p className="text-xs text-green-700 mt-1">After free trial</p>
            </div>
          </div>
        </div>

        {/* Storage Payment */}
        {trial && !trial.storagePaymentPaid && (
          <div className="bg-white rounded-2xl shadow-xl border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              💾 Storage Payment
            </h2>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-900 mb-3">
                Upgrade storage from 100MB to 1GB monthly for ₹50 (one-time)
              </p>
              <button
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg hover:shadow-lg hover:shadow-yellow-500/30 font-medium transition-all flex items-center justify-center gap-2"
              >
                💳 Pay ₹50 for 1GB Storage
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow-xl border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {trial && trial.storagePaymentPaid && (
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">
                      {new Date().toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Storage
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">₹50</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ Completed
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">TXN123456</td>
                  </tr>
                )}
                {(!trial || !trial.storagePaymentPaid) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <span className="text-3xl mb-2 block">📭</span>
                      No payment history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            ✨ Features Included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              '💬 WhatsApp Conversations',
              '📊 Lead Management',
              '🏷️ Labels & Filters',
              '📈 Sales Funnel Tracking',
              '📧 Email Integration',
              '🤖 Bot Automation',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="text-lg">✅</span>
                <span className="text-gray-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
