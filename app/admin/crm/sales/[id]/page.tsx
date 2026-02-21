'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface SaleRecord {
  _id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  workshopName?: string;
  batchDate?: string;
  saleAmount?: number;
  workshopFee?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentType?: 'full' | 'part' | 'advance';
  paymentHistory?: Array<{
    amount: number;
    date: string;
    mode: string;
    transactionId?: string;
    note?: string;
  }>;
  transactionId?: string;
  paymentMode?: string;
  saleDate?: string;
  reportedByUserId?: string;
  leadId?: string | { _id: string; name?: string; phoneNumber?: string };
  status?: string;
  labels?: string[];
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const id = params?.id as string;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sale details
  useEffect(() => {
    if (!id || !token) return;

    const fetchSale = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/crm/sales?id=${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load sale: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setSale(data.data[0]);
        } else if (data.data && !Array.isArray(data.data)) {
          setSale(data.data);
        } else {
          throw new Error('Sale not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sale');
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id, token]);

  if (!token) {
    return <AlertBox type="error" message="Authentication required" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sale Details" subtitle="Loading..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sale Details" subtitle="Sale not found" />
        <AlertBox type="error" message={error || 'Sale not found'} onClose={() => router.back()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        {/* Back Button - Hidden on print */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-800 border border-white/20 hover:bg-gray-700 text-white transition-colors print:hidden"
        >
          ← Back to Sales
        </button>

        {/* Receipt Document */}
        <div className="bg-gray-900/80 backdrop-blur border-2 border-white/20 rounded-lg overflow-hidden print:bg-white print:border-slate-200 print:border print:rounded-none">
          
          {/* Receipt Header with Green Accent */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black tracking-tight">SWAR YOGA</h1>
                <p className="text-emerald-100 text-sm mt-1">Payment Receipt</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">#{id?.slice(-6).toUpperCase()}</p>
                <p className="text-emerald-100 text-sm mt-1">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Customer & Workshop Info */}
          <div className="px-8 py-6 border-b border-white/20 print:border-slate-200">
            <div className="grid grid-cols-2 gap-8">
              {/* Bill To */}
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 print:text-emerald-600">Bill To</p>
                <p className="text-xl font-bold text-white print:text-slate-900">{sale.customerName || 'Customer'}</p>
                <p className="text-gray-300 mt-1 print:text-slate-600">{sale.customerPhone || ''}</p>
                {sale.customerEmail && <p className="text-gray-400 text-sm print:text-slate-500">{sale.customerEmail}</p>}
                <p className="text-gray-500 text-xs mt-2 font-mono print:text-slate-400">ID: {sale.customerId || id?.slice(-8)}</p>
              </div>
              
              {/* Workshop Details */}
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 print:text-emerald-600">Program Details</p>
                <p className="text-xl font-bold text-white print:text-slate-900">{sale.workshopName || 'Workshop'}</p>
                {sale.batchDate && (
                  <p className="text-gray-300 mt-1 print:text-slate-600">Batch: {new Date(sale.batchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                )}
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full ${
                  sale.status === 'completed' ? 'bg-emerald-600/30 text-emerald-300 print:bg-emerald-100 print:text-emerald-700' :
                  sale.status === 'pending' ? 'bg-yellow-600/30 text-yellow-300 print:bg-yellow-100 print:text-yellow-700' :
                  sale.status === 'cancelled' ? 'bg-red-600/30 text-red-300 print:bg-red-100 print:text-red-700' :
                  'bg-gray-600/30 text-gray-300 print:bg-slate-100 print:text-slate-700'
                }`}>
                  {(sale.status || 'pending').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-white/20 print:border-slate-200">
                  <th className="text-left py-3 text-xs font-bold text-gray-400 uppercase tracking-wider print:text-slate-500">Description</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-400 uppercase tracking-wider print:text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10 print:border-slate-100">
                  <td className="py-4">
                    <p className="font-semibold text-white print:text-slate-900">{sale.workshopName || 'Workshop Enrollment'}</p>
                    <p className="text-gray-400 text-sm print:text-slate-500">Program Fee</p>
                  </td>
                  <td className="py-4 text-right font-semibold text-white print:text-slate-900">₹{(sale.workshopFee || sale.saleAmount || 0).toLocaleString()}</td>
                </tr>
                {sale.paymentHistory && sale.paymentHistory.length > 0 && sale.paymentHistory.map((payment, idx) => (
                  <tr key={idx} className="border-b border-white/10 print:border-slate-100">
                    <td className="py-3">
                      <p className="text-gray-200 print:text-slate-700">Payment Received</p>
                      <p className="text-gray-500 text-xs print:text-slate-400">{new Date(payment.date).toLocaleDateString('en-IN')} • {payment.mode}</p>
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-semibold print:text-emerald-600">- ₹{Number(payment.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/30 print:border-slate-300">
                  <td className="py-4 font-bold text-gray-200 print:text-slate-700">Total Paid</td>
                  <td className="py-4 text-right text-2xl font-black text-emerald-400 print:text-emerald-600">₹{(sale.paidAmount || sale.saleAmount || 0).toLocaleString()}</td>
                </tr>
                {(sale.dueAmount || 0) > 0 && (
                  <tr>
                    <td className="py-2 text-gray-400 print:text-slate-500">Balance Due</td>
                    <td className="py-2 text-right text-lg font-bold text-orange-400 print:text-orange-600">₹{(sale.dueAmount || 0).toLocaleString()}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Payment Method */}
          <div className="px-8 py-4 bg-gray-800/50 border-t border-white/20 print:bg-slate-50 print:border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider print:text-slate-500">Payment Method</p>
                <p className="text-lg font-semibold text-white capitalize print:text-slate-800">{sale.paymentMode || 'N/A'}</p>
              </div>
              {sale.transactionId && (
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider print:text-slate-500">Transaction ID</p>
                  <p className="text-sm font-mono text-gray-300 print:text-slate-700">{sale.transactionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-t border-emerald-500/30 print:from-emerald-50 print:to-teal-50 print:border-emerald-200">
            <div className="text-center">
              <p className="text-emerald-300 font-semibold print:text-emerald-700">Thank you for your enrollment!</p>
              <p className="text-gray-400 text-sm mt-1 print:text-slate-500">For queries, contact us at swaryoga.com</p>
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-500/30 flex justify-between text-xs text-gray-500 print:border-emerald-200 print:text-slate-400">
              <span>Generated: {new Date().toLocaleString('en-IN')}</span>
              <span>Receipt ID: {id}</span>
            </div>
          </div>
        </div>

        {/* Print Button - Hidden on print */}
        <div className="mt-6 flex justify-center gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors border border-emerald-500"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
