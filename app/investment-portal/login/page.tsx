'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { portalFetch, setInvestorToken, inputClass, labelClass } from '../_shared';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const json = await portalFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ phone, certificateNumber: certificateNumber.trim().toUpperCase() }),
      });
      setInvestorToken(json.token);
      router.push('/investment-portal/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-black text-white p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-yellow-300">Investor sign in</p>
          <h1 className="mt-2 text-3xl font-black">Welcome back</h1>
          <p className="mt-2 text-white/70 text-sm">Use the WhatsApp number you registered with and your certificate number.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className={labelClass + ' !text-white/70'}>WhatsApp number</span>
              <input required inputMode="numeric" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass + ' !text-white/70'}>Certificate number</span>
              <input required placeholder="SY-INV-2026-001" className={inputClass} value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
            </label>

            {error && <div className="rounded-xl bg-red-500/15 text-red-200 border border-red-400/30 p-3 text-sm">{error}</div>}

            <button type="submit" disabled={busy} className="w-full py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-green-400 text-black font-black disabled:opacity-60">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/70">
            New here? <Link href="/investment-portal/join" className="text-yellow-300 font-semibold hover:underline">Join now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
