'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import { Menu, Trash2, Clock, AlertTriangle } from 'lucide-react';

export default function OrderMaintenancePage() {
  const router = useRouter();
  const token = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Purge state
  const [purgeEmail, setPurgeEmail] = useState('');
  const [purgeOlderThanDays, setPurgeOlderThanDays] = useState('');
  const [purgePaymentMethod, setPurgePaymentMethod] = useState('');
  const [purgePreviewCount, setPurgePreviewCount] = useState<number | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState('');

  // Expire state
  const [expireEmail, setExpireEmail] = useState('');
  const [expireOlderThanMinutes, setExpireOlderThanMinutes] = useState('60');
  const [expirePaymentMethod, setExpirePaymentMethod] = useState('');
  const [expirePreviewCount, setExpirePreviewCount] = useState<number | null>(null);
  const [expireBusy, setExpireBusy] = useState(false);
  const [expireMsg, setExpireMsg] = useState('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('admin_user');
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';
      if (!userStr) {
        setIsSuperAdmin(fallbackUserId === 'admin');
        return;
      }
      const u = JSON.parse(userStr);
      const userId = (u?.userId as string) || fallbackUserId;
      const permissions: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin(userId === 'admin' || permissions.includes('all'));
    } catch {
      const fallbackUserId = localStorage.getItem('adminUser') || localStorage.getItem('adminUserId') || '';
      setIsSuperAdmin(fallbackUserId === 'admin');
    }
  }, []);

  const previewPurge = useCallback(async () => {
    setPurgeBusy(true);
    setPurgeMsg('');
    try {
      const params = new URLSearchParams();
      if (purgeEmail) params.set('email', purgeEmail);
      if (purgeOlderThanDays) params.set('olderThanDays', purgeOlderThanDays);
      if (purgePaymentMethod) params.set('paymentMethod', purgePaymentMethod);
      const res = await fetch(`/api/admin/orders/purge-failed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setPurgePreviewCount(json.count ?? json.deleted ?? 0);
    } catch (err) {
      setPurgeMsg('Preview failed');
    } finally {
      setPurgeBusy(false);
    }
  }, [purgeEmail, purgeOlderThanDays, purgePaymentMethod, token]);

  const runPurge = useCallback(async () => {
    if (!confirm('Permanently delete matching failed orders?')) return;
    setPurgeBusy(true);
    setPurgeMsg('');
    try {
      const bodyParams: Record<string, string> = {};
      if (purgeEmail) bodyParams.email = purgeEmail;
      if (purgeOlderThanDays) bodyParams.olderThanDays = purgeOlderThanDays;
      if (purgePaymentMethod) bodyParams.paymentMethod = purgePaymentMethod;
      const res = await fetch('/api/admin/orders/purge-failed', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyParams),
      });
      const json = await res.json();
      setPurgeMsg(`Deleted ${json.deleted ?? 0} orders`);
      setPurgePreviewCount(null);
    } catch (err) {
      setPurgeMsg('Purge failed');
    } finally {
      setPurgeBusy(false);
    }
  }, [purgeEmail, purgeOlderThanDays, purgePaymentMethod, token]);

  const previewExpire = useCallback(async () => {
    setExpireBusy(true);
    setExpireMsg('');
    try {
      const params = new URLSearchParams();
      if (expireEmail) params.set('email', expireEmail);
      if (expireOlderThanMinutes) params.set('olderThanMinutes', expireOlderThanMinutes);
      if (expirePaymentMethod) params.set('paymentMethod', expirePaymentMethod);
      const res = await fetch(`/api/admin/orders/expire-pending?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setExpirePreviewCount(json.count ?? json.expired ?? 0);
    } catch (err) {
      setExpireMsg('Preview failed');
    } finally {
      setExpireBusy(false);
    }
  }, [expireEmail, expireOlderThanMinutes, expirePaymentMethod, token]);

  const runExpire = useCallback(async () => {
    if (!confirm('Mark matching pending orders as failed?')) return;
    setExpireBusy(true);
    setExpireMsg('');
    try {
      const bodyParams: Record<string, string> = {};
      if (expireEmail) bodyParams.email = expireEmail;
      if (expireOlderThanMinutes) bodyParams.olderThanMinutes = expireOlderThanMinutes;
      if (expirePaymentMethod) bodyParams.paymentMethod = expirePaymentMethod;
      const res = await fetch('/api/admin/orders/expire-pending', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyParams),
      });
      const json = await res.json();
      setExpireMsg(`Expired ${json.expired ?? 0} orders`);
      setExpirePreviewCount(null);
    } catch (err) {
      setExpireMsg('Expire failed');
    } finally {
      setExpireBusy(false);
    }
  }, [expireEmail, expireOlderThanMinutes, expirePaymentMethod, token]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-swar-bg flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-swar-text mb-2">Access Denied</h1>
          <p className="text-swar-text-secondary">Super Admin access required for order maintenance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-swar-bg flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-swar-border px-4 md:px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-swar-primary-light">
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-swar-text">Order Maintenance</h1>
            <p className="text-sm text-swar-text-secondary">Manage failed and pending orders</p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purge Failed Orders */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-swar-text">Purge Failed Orders</h2>
                  <p className="text-xs text-swar-text-secondary">Permanently deletes failed orders</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={purgeEmail}
                  onChange={(e) => setPurgeEmail(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Email (optional)"
                />
                <input
                  value={purgeOlderThanDays}
                  onChange={(e) => setPurgeOlderThanDays(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Older than (days)"
                  inputMode="numeric"
                />
                <input
                  value={purgePaymentMethod}
                  onChange={(e) => setPurgePaymentMethod(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Payment method"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <button
                  onClick={previewPurge}
                  disabled={purgeBusy}
                  className="px-4 py-2 rounded-lg border border-swar-border bg-white text-sm font-medium hover:border-swar-primary disabled:opacity-50"
                >
                  Preview
                </button>
                <button
                  onClick={runPurge}
                  disabled={purgeBusy}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
                {purgePreviewCount != null && (
                  <span className="text-sm text-swar-text-secondary">
                    Matching: <strong>{purgePreviewCount}</strong>
                  </span>
                )}
                {purgeMsg && <span className="text-sm text-green-600 font-medium">{purgeMsg}</span>}
              </div>
            </div>

            {/* Expire Pending Orders */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-swar-text">Expire Pending Orders</h2>
                  <p className="text-xs text-swar-text-secondary">Marks stale pending orders as failed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={expireEmail}
                  onChange={(e) => setExpireEmail(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Email (optional)"
                />
                <input
                  value={expireOlderThanMinutes}
                  onChange={(e) => setExpireOlderThanMinutes(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Older than (min)"
                  inputMode="numeric"
                />
                <input
                  value={expirePaymentMethod}
                  onChange={(e) => setExpirePaymentMethod(e.target.value)}
                  className="border border-swar-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Payment method"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <button
                  onClick={previewExpire}
                  disabled={expireBusy}
                  className="px-4 py-2 rounded-lg border border-swar-border bg-white text-sm font-medium hover:border-swar-primary disabled:opacity-50"
                >
                  Preview
                </button>
                <button
                  onClick={runExpire}
                  disabled={expireBusy}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  Expire
                </button>
                {expirePreviewCount != null && (
                  <span className="text-sm text-swar-text-secondary">
                    Matching: <strong>{expirePreviewCount}</strong>
                  </span>
                )}
                {expireMsg && <span className="text-sm text-green-600 font-medium">{expireMsg}</span>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
