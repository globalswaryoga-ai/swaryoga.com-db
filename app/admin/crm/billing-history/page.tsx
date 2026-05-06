'use client';

import { useAuth } from '@/hooks/useAuth';

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

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  PAID: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  ACTIVE: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Clock },
};

export default function BillingHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/billing-history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch payments');
      const json = await res.json();
      setPayments(json.payments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (payment: Payment) => {
    // Simple receipt generation - could be expanded to PDF
    const receiptText = `
SWAR YOGA CRM - PAYMENT RECEIPT
================================

Order ID: ${payment.orderId}
Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}

Plan: ${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} (${payment.billing})
Storage: ${payment.storageGB || 1} GB

----------------------------
Plan Amount:     ₹${payment.planAmount?.toLocaleString('en-IN') || payment.amount}
Storage Cost:    ₹${payment.storageCost?.toLocaleString('en-IN') || 0}
GST (18%):       ₹${payment.gst?.toLocaleString('en-IN') || 0}
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
        <Loader2 className="w-8 h-8 animate-spin text-swar-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/crm/subscription" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
          <p className="text-sm text-gray-500">View all your payments and download receipts</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No payments yet</h3>
          <p className="text-sm text-gray-500 mb-4">Your payment history will appear here</p>
          <Link
            href="/crm-site/checkout"
            className="inline-flex items-center gap-2 px-4 py-2 bg-swar-primary text-white text-sm font-semibold rounded-xl hover:bg-swar-primary-hover transition"
          >
            <CreditCard className="w-4 h-4" /> Upgrade Plan
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => {
                const status = STATUS_STYLES[payment.cfStatus] || STATUS_STYLES.PENDING;
                const StatusIcon = status.icon;
                return (
                  <tr key={payment._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{payment.orderId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.billing === 'annual' ? 'Annual' : payment.billing === 'quarterly' ? 'Quarterly' : 'Monthly'}
                        {payment.storageGB ? ` + ${payment.storageGB}GB storage` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-gray-500">
                        via {payment.paymentMethod?.toUpperCase() || 'Online'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {payment.cfStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.cfStatus === 'PAID' && (
                        <button
                          onClick={() => downloadInvoice(payment)}
                          className="text-swar-primary hover:text-swar-primary-hover text-sm font-medium flex items-center gap-1 ml-auto"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
