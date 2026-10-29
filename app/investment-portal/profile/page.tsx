'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { portalFetch, getInvestorToken, clearInvestorToken, inputClass, labelClass } from '../_shared';

interface Profile {
  postalAddress: string;
  city: string;
  state: string;
  kycStatus: string;
  panMasked?: string;
  aadhaarMasked?: string;
  bank: { accountHolder: string; bankName: string; accountNumberMasked?: string; ifsc: string };
  nominee: { name: string; relationship: string; phone: string };
}

const EMPTY = {
  postalAddress: '', city: '', state: '',
  panNumber: '', aadhaarNumber: '',
  bankAccountHolder: '', bankName: '', bankAccountNumber: '', confirmBankAccountNumber: '', bankIfsc: '',
  nomineeName: '', nomineeRelationship: '', nomineePhone: '', nomineeAge: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getInvestorToken()) return router.replace('/investment-portal/login');
    portalFetch('/me')
      .then((json) => {
        const inv = json.data.investment as Profile;
        setProfile(inv);
        setForm((f) => ({
          ...f,
          postalAddress: inv.postalAddress,
          city: inv.city,
          state: inv.state,
          bankAccountHolder: inv.bank.accountHolder,
          bankName: inv.bank.bankName,
          bankIfsc: inv.bank.ifsc,
          nomineeName: inv.nominee.name,
          nomineeRelationship: inv.nominee.relationship,
          nomineePhone: inv.nominee.phone,
        }));
      })
      .catch((err) => {
        if (err.status === 401) {
          clearInvestorToken();
          router.replace('/investment-portal/login');
        } else setError(err.message);
      });
  }, [router]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const json = await portalFetch('/me', { method: 'PUT', body: JSON.stringify(form) });
      setProfile(json.data);
      setForm((f) => ({ ...f, panNumber: '', aadhaarNumber: '', bankAccountNumber: '', confirmBankAccountNumber: '' }));
      setMessage('✅ Profile saved');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/investment-portal/dashboard" className="text-sm font-bold text-slate-700 hover:underline">← Dashboard</Link>
        {profile && <KycPill status={profile.kycStatus} />}
      </div>
      <h1 className="mt-4 text-4xl font-black text-slate-900">Your profile</h1>
      <p className="mt-2 text-slate-600">Needed to pay your profit and issue your certificate. Stored securely; account numbers are shown masked after saving.</p>

      <form onSubmit={save} className="mt-10 space-y-8">
        <Section title="Address" accent="bg-pink-500">
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Address" wide><input className={inputClass} value={form.postalAddress} onChange={set('postalAddress')} /></Field>
            <Field label="City"><input className={inputClass} value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><input className={inputClass} value={form.state} onChange={set('state')} /></Field>
          </div>
        </Section>

        <Section title="Identity (KYC)" accent="bg-purple-400">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label={`PAN ${profile?.panMasked ? `(saved ${profile.panMasked})` : ''}`}>
              <input placeholder="ABCDE1234F" className={inputClass} value={form.panNumber} onChange={set('panNumber')} />
            </Field>
            <Field label={`Aadhaar ${profile?.aadhaarMasked ? `(saved ${profile.aadhaarMasked})` : ''}`}>
              <input inputMode="numeric" placeholder="12 digits" className={inputClass} value={form.aadhaarNumber} onChange={set('aadhaarNumber')} />
            </Field>
          </div>
        </Section>

        <Section title="Bank payout account" accent="bg-green-400">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Account holder name"><input className={inputClass} value={form.bankAccountHolder} onChange={set('bankAccountHolder')} /></Field>
            <Field label="Bank name"><input className={inputClass} value={form.bankName} onChange={set('bankName')} /></Field>
            <Field label={`Account number ${profile?.bank.accountNumberMasked ? `(saved ${profile.bank.accountNumberMasked})` : ''}`}>
              <input inputMode="numeric" className={inputClass} value={form.bankAccountNumber} onChange={set('bankAccountNumber')} />
            </Field>
            <Field label="Confirm account number"><input inputMode="numeric" className={inputClass} value={form.confirmBankAccountNumber} onChange={set('confirmBankAccountNumber')} /></Field>
            <Field label="IFSC"><input placeholder="SBIN0001234" className={inputClass} value={form.bankIfsc} onChange={set('bankIfsc')} /></Field>
          </div>
        </Section>

        <Section title="Nominee" accent="bg-yellow-300">
          <div className="grid md:grid-cols-4 gap-5">
            <Field label="Name"><input className={inputClass} value={form.nomineeName} onChange={set('nomineeName')} /></Field>
            <Field label="Relationship">
              <select className={inputClass} value={form.nomineeRelationship} onChange={set('nomineeRelationship')}>
                <option value="">Select</option>
                <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
              </select>
            </Field>
            <Field label="Age"><input inputMode="numeric" className={inputClass} value={form.nomineeAge} onChange={set('nomineeAge')} /></Field>
            <Field label="Phone"><input inputMode="numeric" className={inputClass} value={form.nomineePhone} onChange={set('nomineePhone')} /></Field>
          </div>
        </Section>

        {message && <div className="rounded-xl bg-green-100 text-green-900 border border-green-300 p-4 font-semibold">{message}</div>}
        {error && <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 p-4 text-sm">{error}</div>}

        <button type="submit" disabled={busy} className="px-10 py-4 rounded-full bg-black text-white font-black shadow-xl disabled:opacity-60">
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

function KycPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-300 text-black',
    submitted: 'bg-sky-300 text-black',
    verified: 'bg-green-400 text-black',
    rejected: 'bg-red-400 text-black',
  };
  const label: Record<string, string> = {
    pending: '🟡 Pending upload',
    submitted: '🔵 Under verification',
    verified: '🟢 KYC verified',
    rejected: '🔴 Rejected · please update',
  };
  return <span className={`px-4 py-1.5 rounded-full text-xs font-black ${map[status] || 'bg-slate-200'}`}>{label[status] || status}</span>;
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 md:p-8 shadow-lg border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2 h-7 rounded-full ${accent}`} />
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'md:col-span-3' : ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
