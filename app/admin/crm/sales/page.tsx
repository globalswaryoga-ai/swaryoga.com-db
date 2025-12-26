'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  DataTable,
  FormModal,
  StatCard,
  PageHeader,
  LoadingSpinner,
  AlertBox,
  Toolbar,
} from '@/components/admin/crm';

interface SaleRecord {
  _id: string;
  userId?: any;
  leadId?: any;
  saleAmount: number;
  paymentMode: string;
  saleDate?: string;
  createdAt?: string;
}

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageSale: number;
  maxSale: number;
  minSale: number;
  targetAchieved: number;
}

type SalesAggRow = {
  _id: string;
  totalSales: number;
  count: number;
};

export default function SalesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [daily, setDaily] = useState<SalesAggRow[]>([]);
  const [monthly, setMonthly] = useState<SalesAggRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'summary' | 'daily' | 'monthly'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    saleAmount: 0,
    paymentMode: 'payu',
  });

  const fetchSalesData = useCallback(async () => {
    try {
      setError(null);
      const result = await crm.fetch('/api/admin/crm/sales', { params: { view } });
      if (view === 'summary') {
        const s = (result && typeof result === 'object' ? (result as any).summary : null) || {};
        setSummary({
          totalSales: Number(s.totalSales || 0),
          totalTransactions: Number(s.totalTransactions || 0),
          averageSale: Number(s.averageSale || 0),
          maxSale: Number(s.maxSale || 0),
          minSale: Number(s.minSale || 0),
          targetAchieved: Number(s.targetAchieved || 0),
        });
      } else if (view === 'daily') {
        setDaily(Array.isArray((result as any)?.daily) ? (result as any).daily : []);
      } else if (view === 'monthly') {
        setMonthly(Array.isArray((result as any)?.monthly) ? (result as any).monthly : []);
      } else {
        setSales((result as any)?.sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crm, view]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchSalesData();
  }, [token, router, fetchSalesData]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/sales', {
        method: 'POST',
        body: {
          leadId: formData.leadId || undefined,
          saleAmount: formData.saleAmount,
          paymentMode: formData.paymentMode,
        },
      });

      setShowCreateModal(false);
      setFormData({ leadId: '', saleAmount: 0, paymentMode: 'payu' });
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      await crm.fetch('/api/admin/crm/sales', {
        method: 'DELETE',
        params: { saleId },
      });
      setError(null);
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const aggColumns = [
    { key: '_id', label: 'Period' },
    { key: 'count', label: 'Transactions', render: (v: number) => String(v ?? 0) },
    { key: 'totalSales', label: 'Total Revenue', render: (v: number) => `₹${Number(v || 0).toLocaleString()}` },
  ];

  const columns = [
    {
      key: 'leadId',
      label: 'Lead',
      render: (lead: any) => (typeof lead === 'string' ? lead.slice(-6) : (lead?._id || 'N/A').slice?.(-6) || 'N/A'),
    },
    { key: 'saleAmount', label: 'Amount', render: (amt: number) => `₹${amt?.toLocaleString() || 0}` },
    { key: 'paymentMode', label: 'Payment', render: (mode: string) => mode.charAt(0).toUpperCase() + mode.slice(1) },
    {
      key: 'saleDate',
      label: 'Date',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, sale: SaleRecord) => (
        <button
          onClick={() => handleDeleteSale(sale._id)}
          className="px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Sales Dashboard"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              + Record Sale
            </button>
          }
        />

        {/* Error Alert */}
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* View Selector */}
        <div className="flex gap-2 flex-wrap">
          {(['list', 'summary', 'daily', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === v
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                  : 'bg-slate-800/50 text-purple-200 border border-purple-500/20 hover:border-purple-500/50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)} View
            </button>
          ))}
        </div>

        {/* Loading State */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary View */}
            {view === 'summary' && summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Sales"
                  value={String(summary.totalTransactions || 0)}
                  icon="📊"
                  color="purple"
                />
                <StatCard
                  label="Total Revenue"
                  value={`₹${Number(summary.totalSales || 0).toLocaleString()}`}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  label="Average Sale"
                  value={`₹${Number(summary.averageSale || 0).toLocaleString()}`}
                  icon="📈"
                  color="blue"
                />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-white font-semibold mb-4 text-sm">Summary</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-purple-200 text-xs"><span>Max Sale</span><span>₹{Number(summary.maxSale || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between text-purple-200 text-xs"><span>Min Sale</span><span>₹{Number(summary.minSale || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between text-purple-200 text-xs"><span>Target Achieved</span><span>{Number(summary.targetAchieved || 0)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {view === 'daily' && (
              <DataTable
                columns={aggColumns}
                data={daily}
                loading={crm.loading}
                empty={daily.length === 0}
                striped
                hover
              />
            )}

            {view === 'monthly' && (
              <DataTable
                columns={aggColumns}
                data={monthly}
                loading={crm.loading}
                empty={monthly.length === 0}
                striped
                hover
              />
            )}

            {/* Sales List */}
            {view === 'list' && (
              <DataTable
                columns={columns}
                data={sales}
                loading={crm.loading}
                empty={sales.length === 0}
                striped
                hover
              />
            )}
          </>
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateModal && (
        <FormModal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSale}
          title="Record New Sale"
          submitLabel="Record Sale"
          cancelLabel="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Lead ID (optional)</label>
              <input
                type="text"
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter lead ID"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.saleAmount}
                onChange={(e) => setFormData({ ...formData, saleAmount: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="payu">PayU</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
