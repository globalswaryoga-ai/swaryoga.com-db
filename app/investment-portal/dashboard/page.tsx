'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { portalFetch, getInvestorToken, clearInvestorToken, rupees, openCashfreeCheckout } from '../_shared';

export const dynamic = 'force-dynamic';

interface Investment {
  certificateNumber: string;
  investorName: string;
  totalInvestmentAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: string;
  kycStatus: string;
  profileComplete: boolean;
  finalDeadline: string;
  profit5yr: number;
  profit10yr: number;
  maturityAmount: number;
}

interface Payment {
  txnid: string;
  purpose: 'booking' | 'balance';
  amount: number;
  status: string;
  createdAt: string;
}

const PAYMENT_BANNERS: Record<string, { text: string; cls: string }> = {
  success: { text: 'Payment received. Thank you!', cls: 'bg-green-100 text-green-900 border-green-300' },
  failed: { text: 'Payment was not completed. You can try again.', cls: 'bg-red-100 text-red-900 border-red-300' },
  invalid: { text: 'We could not verify that payment. If money was deducted, contact Swar Yoga with your receipt.', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  cancelled: { text: 'Payment was cancelled. You can pay again whenever you are ready.', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  error: { text: 'Something went wrong while recording your payment. Please contact Swar Yoga.', cls: 'bg-red-100 text-red-900 border-red-300' },
};

function DashboardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentResult = params.get('payment');
  const welcome = params.get('welcome');
  const payError = params.get('payError');

  const [inv, setInv] = useState<Investment | null>(null);
  const [options, setOptions] = useState<{ booking: { amount: number } | null; balance: { amount: number } | null }>({ booking: null, balance: null });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getInvestorToken()) {
      router.replace('/investment-portal/login');
      return;
    }
    try {
      const json = await portalFetch('/me');
      setInv(json.data.investment);
      setOptions(json.data.options);
      setPayments(json.data.payments);
    } catch (err: any) {
      if (err.status === 401) {
        clearInvestorToken();
        router.replace('/investment-portal/login');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Submit the PayU form for the server-calculated amount
  const pay = async (purpose: 'booking' | 'balance') => {
    setPaying(purpose);
    setError('');
    try {
      const json = await portalFetch('/pay', { method: 'POST', body: JSON.stringify({ purpose }) });
      await openCashfreeCheckout(json.data.sdkUrl, json.data.mode, json.data.paymentSessionId);
    } catch (err: any) {
      setError(err.message);
      setPaying(null);
    }
  };

  const signOut = () => {
    clearInvestorToken();
    router.push('/investment-portal/login');
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading your dashboard…</div>;
  if (error && !inv) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!inv) return null;

  const progress = Math.min((inv.amountPaid / inv.totalInvestmentAmount) * 100, 100);
  const banner = paymentResult ? PAYMENT_BANNERS[paymentResult] : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Investor dashboard</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-black text-slate-900">Hello, {inv.investorName.split(' ')[0]} 🙏</h1>
          <p className="text-slate-600 text-sm mt-1">Certificate <span className="font-bold text-slate-900">{inv.certificateNumber}</span></p>
        </div>
        <div className="flex gap-3">
          <Link href="/investment-portal/profile" className="px-5 py-2.5 rounded-full bg-black text-white text-sm font-bold">Update profile</Link>
          <button onClick={signOut} className="px-5 py-2.5 rounded-full border border-slate-300 text-sm font-bold text-slate-700">Sign out</button>
        </div>
      </div>

      {welcome && <Banner cls="bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300" text="🎉 Well done! Your seat is reserved. Pay the booking amount to confirm it." />}
      {banner && <Banner cls={banner.cls} text={banner.text} />}
      {payError && <Banner cls="bg-red-100 text-red-900 border-red-300" text={`Payment page could not open: ${payError}`} />}
      {error && <Banner cls="bg-red-100 text-red-900 border-red-300" text={error} />}

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Stat label="Total committed" value={rupees(inv.totalInvestmentAmount)} className="bg-black text-white" valueCls="text-yellow-300" />
        <Stat label="Amount paid" value={rupees(inv.amountPaid)} className="bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white" valueCls="text-white" />
        <Stat label="Remaining balance" value={rupees(inv.remainingBalance)} className="bg-gradient-to-br from-green-400 to-emerald-500 text-black" valueCls="text-black" />
      </div>

      {/* Progress + payment actions */}
      <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Payment status</p>
            <p className="mt-1 text-xl font-black text-slate-900">{statusLabel(inv.paymentStatus)}</p>
          </div>
          <p className="text-sm text-slate-600">Balance due by <strong className="text-slate-900">{inv.finalDeadline}</strong></p>
        </div>
        <div className="mt-5 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-green-400" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          {options.booking && (
            <button onClick={() => pay('booking')} disabled={paying !== null} className="px-8 py-3.5 rounded-full bg-pink-500 text-white font-black shadow-lg disabled:opacity-60">
              {paying === 'booking' ? 'Opening PayU…' : `Pay booking ${rupees(options.booking.amount)}`}
            </button>
          )}
          {options.balance && (
            <button onClick={() => pay('balance')} disabled={paying !== null} className="px-8 py-3.5 rounded-full bg-green-500 text-black font-black shadow-lg disabled:opacity-60">
              {paying === 'balance' ? 'Opening PayU…' : `Pay remaining ${rupees(options.balance.amount)}`}
            </button>
          )}
          {!options.booking && !options.balance && (
            <p className="text-green-700 font-bold">✅ Fully paid. Thank you!</p>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-3xl bg-black text-white p-8">
        <p className="text-xs font-black uppercase tracking-widest text-yellow-300">Your returns</p>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <Milestone label="Annual profit (minimum)" value="16% p.a." color="text-pink-300" />
          <Milestone label="Profit at 5 years" value={rupees(inv.profit5yr)} color="text-purple-300" />
          <Milestone label="Profit at 10 years" value={rupees(inv.profit10yr)} color="text-green-300" />
        </div>
      </div>

      {/* Profile + KYC */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 p-8">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Profile</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{inv.profileComplete ? 'Complete' : 'Action needed'}</p>
          <p className="text-sm text-slate-600 mt-1">Add your PAN, Aadhaar, bank payout account and nominee so we can pay your profit.</p>
          <Link href="/investment-portal/profile" className="inline-block mt-4 text-sm font-bold text-fuchsia-700 hover:underline">Complete profile →</Link>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 p-8">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Recent payments</p>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No payments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {payments.slice(0, 5).map((p) => (
                <li key={p.txnid} className="py-2 flex justify-between">
                  <span className="capitalize">{p.purpose} · {p.txnid}</span>
                  <span className={p.status === 'success' ? 'text-green-700 font-bold' : 'text-slate-500'}>{rupees(p.amount)} · {p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'awaiting_payment': return '⏳ Awaiting booking payment';
    case 'booking_paid': return '🟡 Booking paid · balance pending';
    case 'fully_paid': return '🟢 Fully paid';
    default: return status;
  }
}

function Banner({ text, cls }: { text: string; cls: string }) {
  return <div className={`rounded-2xl border p-4 font-semibold ${cls}`}>{text}</div>;
}

function Stat({ label, value, className, valueCls }: { label: string; value: string; className: string; valueCls: string }) {
  return (
    <div className={`rounded-3xl p-7 shadow-lg ${className}`}>
      <p className="text-xs font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className={`mt-3 text-4xl font-black ${valueCls}`}>{value}</p>
    </div>
  );
}

function Milestone({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-sm text-white/70">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
