/**
 * Investment Offer Page (ADMIN PREVIEW, NOT PUBLISHED)
 * Lives under /admin so it is not reachable by the public. Move it to /invest
 * only when it is approved for publishing.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RegistrationCountdown from '@/components/investment/RegistrationCountdown';

interface Stats {
  totalCapacity: number;
  slotsClaimed: number;
  remainingSlots: number;
}

export default function InvestmentOfferPreviewPage() {
  const token = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [seatError, setSeatError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/investment', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `Seat count failed (HTTP ${r.status})`);
        if (!j?.data?.stats) throw new Error('Seat count missing from response');
        setStats(j.data.stats);
        setSeatError('');
      })
      .catch((err) => {
        setStats(null);
        setSeatError(err.message || 'Could not load seats');
      });
  }, [token]);

  const total = stats?.totalCapacity ?? 150;
  const claimed = stats?.slotsClaimed ?? 0;
  const pct = Math.min((claimed / total) * 100, 100);

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-yellow-300 text-black text-xs font-bold tracking-widest text-center py-2 px-4">
        ADMIN PREVIEW · NOT PUBLISHED · NOT LINKED FROM THE PUBLIC SITE
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-pink-500/40 blur-3xl" />
        <div className="absolute top-10 right-0 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-green-400/30 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-yellow-300 text-black text-xs font-black tracking-widest uppercase">
            Swar Yoga Education Investment
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-pink-400 via-purple-300 to-green-300 bg-clip-text text-transparent">
              Investment offer
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-2xl text-white/90 max-w-3xl mx-auto">
            Invest in <span className="font-bold text-yellow-300">Swar Yoga Education company</span> and get
          </p>
          <p className="mt-2 text-4xl md:text-6xl font-black text-yellow-300">16% annual profit minimum</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Pill className="bg-pink-500 text-white">16% annual profit</Pill>
            <Pill className="bg-purple-300 text-black">Payment due 15 December</Pill>
            <Pill className="bg-green-400 text-black">{total} seats only</Pill>
          </div>
          <div className="mt-10">
            <JoinButton />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16 bg-gradient-to-b from-purple-100 via-pink-50 to-green-50">
        <RegistrationCountdown />
        {/* PROFIT */}
        <section>
          <SectionHeader eyebrow="Returns" title="Your profit, every year" />
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <ProfitCard label="Annual profit" value="16%" color="bg-pink-500" text="text-white" />
            <ProfitCard label="Minimum guaranteed" value="16% p.a." color="bg-purple-300" text="text-black" />
            <ProfitCard label="Offer" value="Investment" color="bg-green-400" text="text-black" />
          </div>
        </section>

        {/* SEATS + DATES */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-black text-white p-8 shadow-xl">
            <p className="text-xs font-black uppercase tracking-widest text-yellow-300">Availability</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-black uppercase whitespace-nowrap text-white">Last remain</h2>
            <h3 className="mt-1 flex flex-wrap items-baseline gap-x-4 uppercase text-yellow-300">
              <span className="text-2xl font-normal">Only -</span>
              <span className="text-7xl md:text-8xl font-normal leading-none text-green-400 tabular-nums">{stats ? stats.remainingSlots : total}</span>
              <span className="text-2xl font-normal">seats</span>
            </h3>
            <p
              className="mt-3 inline-block rounded-full bg-pink-500 px-5 py-1.5 text-lg font-black uppercase tracking-widest text-white"
              style={{ animation: 'sy-hurry-blink 3s ease-in-out infinite' }}
            >
              <style>{`@keyframes sy-hurry-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }`}</style>
              Hurry up!
            </p>
            <div className="mt-6 h-3 w-full bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 via-purple-300 to-green-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-white/85">
              {stats ? `${claimed} seats taken` : seatError || 'Loading live seat count…'}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl border-t-8 border-yellow-300">
            <p className="text-xs font-black uppercase tracking-widest text-pink-600">Key date</p>
            <h2 className="mt-4 text-2xl lg:text-3xl font-black uppercase whitespace-nowrap text-black">Book your seat today</h2>
            <h3 className="mt-3 text-xl font-extrabold uppercase tracking-widest text-pink-600">Pay up to</h3>
            <p className="mt-1 text-4xl md:text-5xl font-black uppercase text-green-700">15th Dec 2026</p>
            <dl className="mt-4">
              <div className="flex justify-between gap-4 py-4">
                <dt className="text-gray-600">Payment due (last date)</dt>
                <dd className="font-black text-black">15 December</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* VISION & MISSION */}
        <section className="rounded-3xl border-4 border-green-500 p-3 shadow-xl">
          <div className="rounded-2xl bg-white p-8 md:p-10 text-black">
            <p className="text-xs font-black uppercase tracking-widest text-green-700">Our vision & mission</p>
            <p className="mt-4 text-xl md:text-2xl font-bold leading-relaxed text-black">
              Our dream is to take the ancient knowledge of Swar Yoga to the entire world in 20 different languages. We want every individual, irrespective of language or country, to understand and apply Swar Yoga in daily life and move towards a healthier, happier and more prosperous life.
            </p>
            <p className="mt-6 text-lg font-semibold text-black">
              Your investment will help us take this knowledge to millions of people worldwide.
            </p>
          </div>
        </section>

        {/* INFO */}
        <section className="rounded-3xl bg-gradient-to-r from-green-400 via-purple-300 to-pink-400 p-1">
          <div className="rounded-[calc(1.5rem-4px)] bg-black text-white p-8 md:p-10 grid md:grid-cols-3 gap-6">
            <Feature title="SWAR YOGA EDUCATION" text="Organised by: Upamanyu International Education Pvt. Ltd." />
            <Feature title="16% annual profit" text="Minimum 16% profit every year on your investment." />
            <Feature title="Pay by 15 December" text="Complete your payment on or before the last date." />
          </div>
        </section>

        <section className="text-center">
          <JoinButton />
        </section>
      </div>
    </div>
  );
}

function JoinButton() {
  return (
    <a
      href="/investment-portal/join"
      className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-green-400 text-black text-lg font-black shadow-2xl hover:scale-105 transition-transform"
    >
      Join Now →
    </a>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`px-5 py-2 rounded-full font-bold shadow-lg ${className}`}>{children}</span>;
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-purple-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black text-black">{title}</h2>
    </div>
  );
}

function ProfitCard({ label, value, color, text }: { label: string; value: string; color: string; text: string }) {
  return (
    <div className={`rounded-3xl ${color} ${text} p-8 shadow-xl`}>
      <p className="text-sm font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-3 text-5xl font-black">{value}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-lg font-black text-yellow-300">{title}</h3>
      <p className="mt-2 text-white/80 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
