'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { portalFetch, setInvestorToken, inputClass, labelClass, rupees, openCashfreeCheckout } from '../_shared';
import RegistrationCountdown from '@/components/investment/RegistrationCountdown';

export default function JoinPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    investorName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    postalAddress: '',
    totalInvestmentAmount: '11000',
    payNowAmount: '1000',
    nomineeName: '',
    nomineeRelationship: '',
    nomineePhone: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const json = await portalFetch('/join', {
        method: 'POST',
        body: JSON.stringify({ ...form, payNowAmount: Number(form.payNowAmount) }),
      });
      setInvestorToken(json.token);
      // Open the PayU payment page for the first payment straight away
      try {
        const pay = await portalFetch('/pay', { method: 'POST', body: JSON.stringify({ purpose: 'booking' }) });
        await openCashfreeCheckout(pay.data.sdkUrl, pay.data.mode, pay.data.paymentSessionId);
        return;
      } catch (payErr: any) {
        // Seat is held and signed in; the dashboard has the retry button
        router.push(`/investment-portal/dashboard?welcome=1&payError=${encodeURIComponent(payErr.message)}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const amount = Number(form.totalInvestmentAmount) || 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-fuchsia-700">Investment Registration</span>
        <Link href="/investment-portal/login" className="text-sm font-semibold text-slate-700 hover:underline">Already invested? Sign in →</Link>
      </div>
      <h1 className="mt-3 text-4xl font-black text-slate-900">Join the Swar Yoga Education investment</h1>
      <p className="mt-2 text-slate-600">Minimum ₹11,000 · 16% annual profit minimum · Pay by 15 December</p>
      <div className="mt-6"><RegistrationCountdown /></div>

      <form onSubmit={submit} className="mt-10 space-y-8">
        <Card title="1. Your details" accent="bg-pink-500">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Full name *"><input required className={inputClass} value={form.investorName} onChange={set('investorName')} /></Field>
            <Field label="WhatsApp number *"><input required inputMode="numeric" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
            <Field label="City"><input className={inputClass} value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><input className={inputClass} value={form.state} onChange={set('state')} /></Field>
            <Field label="Address"><input className={inputClass} value={form.postalAddress} onChange={set('postalAddress')} /></Field>
          </div>
        </Card>

        <Card title="2. Investment amount" accent="bg-yellow-300">
          <Field label="Amount (₹, minimum 11,000 · maximum 1,10,000)">
            <input required type="number" min={11000} max={110000} step={1000} className="w-full md:w-1/2 rounded-xl border-2 border-green-500 bg-green-50 px-4 py-3 text-xl font-black text-black focus:outline-none focus:ring-2 focus:ring-green-400" value={form.totalInvestmentAmount} onChange={set('totalInvestmentAmount')} />
          </Field>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black text-white p-5">
              <p className="text-xs font-black uppercase tracking-widest text-white/60">Your investment</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">{rupees(amount)}</p>
            </div>
            <div className="rounded-2xl bg-green-600 text-white p-5">
              <p className="text-xs font-black uppercase tracking-widest text-white/80">Balance after this payment</p>
              <p className="mt-2 text-2xl font-black">{rupees(Math.max(amount - (Number(form.payNowAmount) || 0), 0))}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border-2 border-pink-400 bg-pink-50 p-5">
            <label className="block">
              <span className="block text-sm font-black uppercase tracking-wide text-pink-700">Now I am paying (₹)</span>
              <input
                required
                type="number"
                min={1000}
                max={amount}
                step={100}
                className="mt-2 w-full rounded-xl border border-pink-300 bg-white px-4 py-3 text-xl font-black text-black focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={form.payNowAmount}
                onChange={set('payNowAmount')}
              />
            </label>
            <p className="mt-2 text-xs font-semibold text-slate-700">Minimum ₹1,000 · non-refundable</p>
          </div>
        </Card>

        <Card title="3. Nominee (optional now)" accent="bg-green-400">
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Nominee name"><input className={inputClass} value={form.nomineeName} onChange={set('nomineeName')} /></Field>
            <Field label="Relationship">
              <select className={inputClass} value={form.nomineeRelationship} onChange={set('nomineeRelationship')}>
                <option value="">Select</option>
                <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
              </select>
            </Field>
            <Field label="Nominee phone"><input inputMode="numeric" className={inputClass} value={form.nomineePhone} onChange={set('nomineePhone')} /></Field>
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 p-4 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full md:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-green-400 text-black font-black text-lg shadow-xl disabled:opacity-60"
        >
          {busy ? 'Reserving your seat…' : 'Reserve my seat →'}
        </button>
        <p className="text-xs text-slate-500">Your seat is held after you submit. Payment is recorded only when PayU confirms it.</p>
      </form>
    </div>
  );
}

function Card({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 md:p-8 shadow-lg border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2 h-8 rounded-full ${accent}`} />
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
