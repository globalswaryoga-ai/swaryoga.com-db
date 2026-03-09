'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingUp,
  Calendar,
  IndianRupee,
  ArrowRight,
  Receipt,
  RefreshCw,
} from 'lucide-react';

interface Payment {
  _id: string;
  orderId: string;
  plan: string;
  billing: string;
  amount: number;
  planAmount: number;
  storageCost: number;
  gst: number;
  storageGB: number;
  paymentMethod: string;
  cfStatus: string;
  createdAt: string;
}

interface SubscriptionData {
  plan: string;
  billing: string;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  autopayEnabled?: boolean;
  paymentMethod?: string;
}

const STATUS_MAP: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  PAID: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Paid' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Failed' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' },
  ACTIVE: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: CheckCircle2, label: 'Active' },
};

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState('');

  const getToken = () =>
    localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const token = getToken();
    if (!token) return;

    try {
      const [payRes, subRes] = await Promise.all([
        fetch('/api/crm-site/billing-history', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/crm-site/subscription', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (payRes.ok) {
        const pData = await payRes.json();
        setPayments(pData.payments || []);
      }
      if (subRes.ok) {
        const sData = await subRes.json();
        setSubscription(sData.subscription || null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute totals
  const totalReceived = payments
    .filter(p => p.cfStatus === 'PAID' || p.cfStatus === 'ACTIVE')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPayments = payments.filter(p => p.cfStatus === 'PAID' || p.cfStatus === 'ACTIVE').length;

  // Next month due calculation
  const getNextDueAmount = () => {
    if (!subscription || subscription.plan === 'free') return 0;
    // Use the last successful payment amount as an estimate
    const lastPaid = payments.find(p => p.cfStatus === 'PAID' || p.cfStatus === 'ACTIVE');
    return lastPaid?.amount || 0;
  };

  const getNextDueDate = () => {
    if (!subscription?.subscriptionEndDate) return null;
    return new Date(subscription.subscriptionEndDate);
  };

  const daysUntilDue = () => {
    const due = getNextDueDate();
    if (!due) return null;
    return Math.max(0, Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const downloadReceipt = (payment: Payment) => {
    const receiptText = `
SWAR YOGA CRM - PAYMENT RECEIPT
================================

Order ID: ${payment.orderId}
Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}

Plan: ${payment.plan?.charAt(0).toUpperCase()}${payment.plan?.slice(1)} (${payment.billing})
Storage: ${payment.storageGB || 1} GB

----------------------------
Plan Amount:     ₹${(payment.planAmount || payment.amount).toLocaleString('en-IN')}
Storage Cost:    ₹${(payment.storageCost || 0).toLocaleString('en-IN')}
GST (18%):       ₹${(payment.gst || 0).toLocaleString('en-IN')}
----------------------------
TOTAL:           ₹${payment.amount.toLocaleString('en-IN')}

Payment Method: ${payment.paymentMethod?.toUpperCase() || 'Online'}
Status: ${payment.cfStatus}

================================
Thank you for your business!
support@swaryoga.com | crm.swaryoga.com
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const nextDue = getNextDueAmount();
  const daysLeft = daysUntilDue();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500">Payment history, invoices & upcoming dues</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Amount Received */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">Total Received</p>
          </div>
          <p className="text-3xl font-bold text-green-800">
            ₹{totalReceived.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-green-600 mt-1">
            From {totalPayments} payment{totalPayments !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Next Month Due */}
        <div className={`rounded-2xl border p-5 ${
          nextDue > 0
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${nextDue > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Calendar className={`w-5 h-5 ${nextDue > 0 ? 'text-amber-600' : 'text-gray-500'}`} />
            </div>
            <p className={`text-sm font-medium ${nextDue > 0 ? 'text-amber-700' : 'text-gray-600'}`}>
              Next Due Amount
            </p>
          </div>
          <p className={`text-3xl font-bold ${nextDue > 0 ? 'text-amber-800' : 'text-gray-700'}`}>
            {nextDue > 0 ? `₹${nextDue.toLocaleString('en-IN')}` : '₹0'}
          </p>
          <p className={`text-xs mt-1 ${nextDue > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
            {daysLeft !== null && daysLeft > 0
              ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
              : subscription?.plan === 'free'
                ? 'Free plan — no dues'
                : 'No upcoming payment'}
          </p>
        </div>

        {/* Current Plan */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-indigo-700">Current Plan</p>
          </div>
          <p className="text-2xl font-bold text-indigo-800 capitalize">
            {subscription?.plan || 'Free'}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            {subscription?.billing === 'annual' ? 'Annual' : subscription?.billing === 'quarterly' ? 'Quarterly' : 'Monthly'} billing
            {subscription?.autopayEnabled && ' • Auto-renewal ON'}
          </p>
          <Link
            href="/admin/crm/subscription"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-2"
          >
            View Plan Details <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Auto-Pay Status */}
      {subscription?.autopayEnabled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Auto-Renewal Enabled</p>
              <p className="text-xs text-emerald-600">
                Your subscription will auto-renew via {subscription.paymentMethod?.toUpperCase() || 'UPI'}
              </p>
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
            <p className="text-sm text-gray-500">All transactions with details</p>
          </div>
          <Receipt className="w-5 h-5 text-gray-400" />
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-16 px-6">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No payments yet</h3>
            <p className="text-sm text-gray-500 mb-4">Your payment history will appear here after your first transaction</p>
            <Link
              href="/crm-site/checkout"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
            >
              <CreditCard className="w-4 h-4" /> Upgrade Plan
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => {
              const status = STATUS_MAP[payment.cfStatus] || STATUS_MAP.PENDING;
              const StatusIcon = status.icon;
              return (
                <div key={payment._id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                        payment.cfStatus === 'PAID' || payment.cfStatus === 'ACTIVE'
                          ? 'bg-green-100'
                          : payment.cfStatus === 'FAILED'
                            ? 'bg-red-100'
                            : 'bg-yellow-100'
                      }`}>
                        <CreditCard className={`w-5 h-5 ${
                          payment.cfStatus === 'PAID' || payment.cfStatus === 'ACTIVE'
                            ? 'text-green-600'
                            : payment.cfStatus === 'FAILED'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`} />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 capitalize">
                            {payment.plan} Plan
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.bg} ${status.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })}
                          {' • '}
                          {payment.billing === 'annual' ? 'Annual' : payment.billing === 'quarterly' ? 'Quarterly' : 'Monthly'}
                          {payment.storageGB ? ` • ${payment.storageGB}GB storage` : ''}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          #{payment.orderId}
                        </p>

                        {/* Breakdown */}
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-[10px] text-gray-500 uppercase">Plan</p>
                            <p className="text-xs font-semibold text-gray-800">₹{(payment.planAmount || payment.amount).toLocaleString('en-IN')}</p>
                          </div>
                          {(payment.storageCost ?? 0) > 0 && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <p className="text-[10px] text-gray-500 uppercase">Storage</p>
                              <p className="text-xs font-semibold text-gray-800">₹{payment.storageCost.toLocaleString('en-IN')}</p>
                            </div>
                          )}
                          {(payment.gst ?? 0) > 0 && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <p className="text-[10px] text-gray-500 uppercase">GST (18%)</p>
                              <p className="text-xs font-semibold text-gray-800">₹{payment.gst.toLocaleString('en-IN')}</p>
                            </div>
                          )}
                          <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-[10px] text-gray-500 uppercase">Method</p>
                            <p className="text-xs font-semibold text-gray-800">{payment.paymentMethod?.toUpperCase() || 'Online'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount + Download */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      {(payment.cfStatus === 'PAID' || payment.cfStatus === 'ACTIVE') && (
                        <button
                          onClick={() => downloadReceipt(payment)}
                          className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
                        >
                          <Download className="w-3 h-3" /> Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Questions about billing?{' '}
          <a href="https://wa.me/919779006820" className="text-indigo-600 hover:underline">Chat with us on WhatsApp</a>
          {' '}or email{' '}
          <a href="mailto:support@swaryoga.com" className="text-indigo-600 hover:underline">support@swaryoga.com</a>
        </p>
      </div>
    </div>
  );
}
