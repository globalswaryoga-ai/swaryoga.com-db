'use client';

import { useState, useEffect } from 'react';
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
  userId: string;
  leadId: string;
  amount: number;
  paymentMode: string;
  status: string;
  createdAt: string;
}

interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  averageSaleAmount: number;
  byPaymentMode: Record<string, { count: number; total: number }>;
}

export default function SalesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'summary'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    amount: 0,
    paymentMode: 'payu',
  });

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchSalesData();
  }, [view, token, router]);

  const fetchSalesData = async () => {
    try {
      crm.setLoading(true);
      const response = await fetch(`/api/admin/crm/sales?view=${view}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch sales');

      const data = await response.json();
      if (data.success) {
        if (view === 'summary') {
          setSummary(data.data);
        } else {
          setSales(data.data.sales);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      crm.setLoading(false);
    }
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/crm/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create sale');

      setShowCreateModal(false);
      setFormData({ leadId: '', amount: 0, paymentMode: 'payu' });
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      const response = await fetch(`/api/admin/crm/sales?saleId=${saleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete sale');
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const columns = [
    { key: 'leadId', label: 'Lead ID', render: (id: string) => id?.slice(-6) || 'N/A' },
    { key: 'amount', label: 'Amount', render: (amt: number) => `₹${amt?.toLocaleString() || 0}` },
    { key: 'paymentMode', label: 'Payment', render: (mode: string) => mode.charAt(0).toUpperCase() + mode.slice(1) },
    { key: 'createdAt', label: 'Date', render: (date: string) => new Date(date).toLocaleDateString() },
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
        {error && <AlertBox type="error" message={error} onDismiss={() => setError(null)} />}

        {/* View Selector */}
        <div className="flex gap-2 flex-wrap">
          {(['list', 'summary'] as const).map((v) => (
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
                  value={summary.totalSales.toString()}
                  icon="📊"
                  color="purple"
                />
                <StatCard
                  label="Total Revenue"
                  value={`₹${summary.totalRevenue.toLocaleString()}`}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  label="Average Sale"
                  value={`₹${summary.averageSaleAmount.toLocaleString()}`}
                  icon="📈"
                  color="blue"
                />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-white font-semibold mb-4 text-sm">Payment Methods</div>
                  <div className="space-y-2">
                    {Object.entries(summary.byPaymentMode).map(([method, data]) => (
                      <div key={method} className="flex justify-between text-purple-200 text-xs">
                        <span className="capitalize">{method}</span>
                        <span>{data.count} sales</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
              <label className="block text-purple-200 text-sm mb-2">Lead ID *</label>
              <input
                type="text"
                required
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
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
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
                <option value="qr_code">QR Code</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
