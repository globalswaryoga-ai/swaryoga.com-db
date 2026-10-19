'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  Trash2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export default function OrderMaintenancePage() {
  const router = useRouter();
  const rawToken = useAuth();
  const [token, setToken] = useState<string>('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const active =
      rawToken ||
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';
    setToken(active);
    setIsSuperAdmin(checkIsSuperAdmin());
  }, [rawToken]);

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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setExpireMsg('Expire failed');
    } finally {
      setExpireBusy(false);
    }
  }, [expireEmail, expireOlderThanMinutes, expirePaymentMethod, token]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h1>
          <p className="text-slate-500 text-sm mb-6">Super Admin privileges required for database order maintenance.</p>
          <button
            onClick={() => router.push('/admin/crm/sales')}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition"
          >
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin/crm/sales"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sales Center
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-rose-600">Database Cleaner</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Order Maintenance
              </h1>
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                Super Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Prune corrupted, abandoned, or failed order records to maintain high query performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/crm/sales"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition"
            >
              💰 Sales Transactions
            </Link>
            <Link
              href="/admin/crm/workshop-offer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition"
            >
              🏷️ Workshop Offers
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purge Policy</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">Permanent</h3>
              <p className="text-xs text-rose-600 font-semibold mt-0.5">Failed Gateway Drops</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expire Timeout</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">60 Minutes</h3>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">Stale Pending Sessions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database Engine</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">Bunny SQL</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Atomic Transactions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security State</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">Protected</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Two-Step Confirmation</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Maintenance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purge Failed Orders */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Purge Failed Orders</h2>
                <p className="text-xs text-slate-500">Permanently removes failed or dropped order attempts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  value={purgeEmail}
                  onChange={(e) => setPurgeEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Optional email"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Age (Days)</label>
                <input
                  value={purgeOlderThanDays}
                  onChange={(e) => setPurgeOlderThanDays(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. 30"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gateway</label>
                <input
                  value={purgePaymentMethod}
                  onChange={(e) => setPurgePaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="razorpay/upi"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2.5 items-center">
              <button
                onClick={previewPurge}
                disabled={purgeBusy}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition disabled:opacity-50"
              >
                Preview Count
              </button>
              <button
                onClick={runPurge}
                disabled={purgeBusy}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-xs disabled:opacity-50"
              >
                Permanently Delete
              </button>
              {purgePreviewCount != null && (
                <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
                  Matching: <strong className="text-rose-600">{purgePreviewCount}</strong>
                </span>
              )}
              {purgeMsg && (
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  {purgeMsg}
                </span>
              )}
            </div>
          </div>

          {/* Expire Pending Orders */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Expire Pending Orders</h2>
                <p className="text-xs text-slate-500">Marks incomplete or timed-out orders as failed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  value={expireEmail}
                  onChange={(e) => setExpireEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Optional email"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Age (Minutes)</label>
                <input
                  value={expireOlderThanMinutes}
                  onChange={(e) => setExpireOlderThanMinutes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Default 60"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gateway</label>
                <input
                  value={expirePaymentMethod}
                  onChange={(e) => setExpirePaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="razorpay/upi"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2.5 items-center">
              <button
                onClick={previewExpire}
                disabled={expireBusy}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition disabled:opacity-50"
              >
                Preview Count
              </button>
              <button
                onClick={runExpire}
                disabled={expireBusy}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs disabled:opacity-50"
              >
                Mark as Expired
              </button>
              {expirePreviewCount != null && (
                <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
                  Matching: <strong className="text-amber-600">{expirePreviewCount}</strong>
                </span>
              )}
              {expireMsg && (
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  {expireMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
