'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';
import { normalizePhoneForMeta } from '@/lib/utils/phone';

interface SaleRecord {
  _id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  workshopName?: string;
  batchDate?: string;
  saleAmount?: number;
  paymentMode?: string;
  saleDate?: string;
  reportedByUserId?: string;
  leadId?: string;
  status?: string;
  labels?: string[];
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
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-700 transition-colors"
        >
          ← Back
        </button>

        {/* A4 Professional Document */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-4 border border-slate-200" style={{ aspectRatio: '8.5/11' }}>
          
          {/* Header */}
          <div className="border-b-2 border-slate-300 pb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-red-600">SALE #{id?.slice(-6).toUpperCase()}</h1>
                <p className="text-xs text-slate-500 mt-1">Document ID: {id}</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p><strong>Date:</strong> {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            
            {/* Left Column - Customer & Lead Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Customer Name</p>
                <p className="font-semibold text-slate-900">{sale.customerName || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Customer ID</p>
                <p className="font-mono text-slate-800">{sale.customerId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Lead ID</p>
                <p className="font-mono text-blue-700">{sale.leadId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Phone</p>
                <p className="font-mono text-slate-800">{sale.customerPhone || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Email</p>
                <p className="text-xs text-slate-800 break-words">{sale.customerEmail || 'N/A'}</p>
              </div>
            </div>

            {/* Right Column - Order & Admin Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Workshop / Program</p>
                <p className="font-semibold text-slate-900">{sale.workshopName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Batch Date</p>
                <p className="font-semibold text-slate-800">{sale.batchDate ? new Date(sale.batchDate).toLocaleDateString() : 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Admin User</p>
                <p className="font-mono text-slate-800">{sale.reportedByUserId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                  sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                  sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  sale.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {sale.status || 'N/A'}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Labels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.isArray(sale.labels) && sale.labels.length > 0 ? (
                    sale.labels.slice(0, 3).map((label, idx) => (
                      <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No labels</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section - Compact */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-lg p-4 my-3">
            <h3 className="text-sm font-bold text-emerald-700 mb-2">PAYMENT DETAILS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded p-3 border border-emerald-200 text-center">
                <p className="text-xs text-slate-600 font-bold">AMOUNT</p>
                <p className="text-2xl font-bold text-emerald-600">₹{(sale.saleAmount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded p-3 border border-emerald-200 text-center">
                <p className="text-xs text-slate-600 font-bold">MODE</p>
                <p className="text-lg font-bold text-slate-800 capitalize">{sale.paymentMode || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <p className="font-bold text-slate-700 mb-2">Transaction History</p>
            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="font-bold">Created:</span> {new Date(sale.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Updated:</span> {new Date(sale.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                const normalized = normalizePhoneForMeta(sale.customerPhone || '');
                router.push(
                  `/admin/crm/whatsapp?leadId=${encodeURIComponent(sale.leadId || '')}&phone=${encodeURIComponent(normalized)}`
                );
              }}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => router.push(`/admin/crm/email?leadId=${encodeURIComponent(sale.leadId || '')}&email=${encodeURIComponent(sale.customerEmail || '')}`)}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
            >
              📧 Email
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Print Hint */}
        <p className="text-center text-slate-500 text-xs mt-4 italic hidden print:block">
          Printed on {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
