'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsSuperAdmin } from '@/lib/client-auth';

// ---------------------------------------------------------------------------
// Tenants Plan — the original 5-tier bundle line-up
// (Basic · Copper · Silver · Golden · Diamond, plus Free), recovered from the
// historical plan definitions. Bundles are inclusive — each tier adds to the
// one before it. This is a super-admin reference of what each plan unlocks.
// ---------------------------------------------------------------------------

interface PlanRow {
  tier: string;
  name: string;
  tagline: string;
  priceMo: number;
  priceYr: number;
  leads: number;
  users: number;
  storageMB: number;
  bundles: string[];
}

// Readable bundle labels, built inclusively per tier.
const FREE = ['Lead Management (CRM)', 'Chatbot'];
const BASIC = [...FREE, 'WhatsApp API', 'Broadcasts'];
const COPPER = [...BASIC, 'Meta Lead Forms'];
const SILVER = [...COPPER, 'AI Voice Calls', 'Payments', 'Certificates', 'Community'];
const GOLDEN = [...SILVER, 'Workshops', 'Life Planner', 'Analytics', 'Custom Domain'];
const DIAMOND = [...GOLDEN, 'Tally Integration', 'API Access'];

const PLANS: PlanRow[] = [
  { tier: 'free',    name: 'Free',    tagline: 'Explore everything — 100 leads.',          priceMo: 0,    priceYr: 0,      leads: 100,    users: 1,  storageMB: 100,    bundles: FREE },
  { tier: 'basic',   name: 'Basic',   tagline: 'Perfect for solo users getting started.', priceMo: 499,  priceYr: 4500,   leads: 1000,   users: 1,  storageMB: 500,    bundles: BASIC },
  { tier: 'copper',  name: 'Copper',  tagline: 'For small teams — 3 users, 5K leads.',     priceMo: 999,  priceYr: 9000,   leads: 5000,   users: 3,  storageMB: 1000,   bundles: COPPER },
  { tier: 'silver',  name: 'Silver',  tagline: 'Growing teams — 10 users, 15K leads.',     priceMo: 1999, priceYr: 18000,  leads: 15000,  users: 10, storageMB: 5000,   bundles: SILVER },
  { tier: 'golden',  name: 'Golden',  tagline: 'Larger teams — 25 users, 50K leads.',      priceMo: 2999, priceYr: 25999,  leads: 50000,  users: 25, storageMB: 20000,  bundles: GOLDEN },
  { tier: 'diamond', name: 'Diamond', tagline: 'Enterprise — 50 users, unlimited leads.',  priceMo: 4999, priceYr: 45000,  leads: 999999, users: 50, storageMB: 100000, bundles: DIAMOND },
];

const STYLE: Record<string, { gradient: string; border: string; badge: string }> = {
  free:    { gradient: 'from-gray-400 to-gray-600',     border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700' },
  basic:   { gradient: 'from-sky-400 to-sky-600',       border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700' },
  copper:  { gradient: 'from-orange-400 to-amber-700',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  silver:  { gradient: 'from-slate-300 to-slate-500',   border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-700' },
  golden:  { gradient: 'from-yellow-400 to-amber-500',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700' },
  diamond: { gradient: 'from-cyan-400 to-indigo-600',   border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
};

function fmtLeads(n: number) {
  if (n >= 999999) return 'Unlimited';
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}

function fmtMB(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

export default function TenantsPlanPage() {
  const router = useRouter();
  useEffect(() => { if (!checkIsSuperAdmin()) router.replace('/admin/crm'); }, [router]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          The full plan line-up &mdash; Basic, Copper, Silver, Golden &amp; Diamond &mdash; and the bundles each tier unlocks. Bundles are inclusive (each tier adds to the previous).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLANS.map((p) => {
          const s = STYLE[p.tier] || STYLE.free;
          return (
            <div key={p.tier} className={`rounded-2xl border ${s.border} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}>
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${s.gradient} px-5 pt-5 pb-4 text-white`}>
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{p.tier}</span>
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <div className="text-2xl font-extrabold">
                  {p.priceMo === 0 ? 'Free' : `₹${p.priceMo.toLocaleString()}`}
                  {p.priceMo > 0 && <span className="text-sm font-normal opacity-70">/mo</span>}
                </div>
                {p.priceYr > 0 && <p className="text-xs opacity-80 mt-0.5">₹{p.priceYr.toLocaleString()}/yr</p>}
                <p className="text-xs opacity-70 mt-1">{p.tagline}</p>
              </div>

              <div className="p-5 flex flex-col flex-1 bg-white">
                {/* Limits */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: '👥', label: 'Leads', val: fmtLeads(p.leads) },
                    { icon: '👤', label: 'Users', val: String(p.users) },
                    { icon: '💾', label: 'Storage', val: fmtMB(p.storageMB) },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-base">{item.icon}</div>
                      <div className="text-[11px] text-gray-400">{item.label}</div>
                      <div className="text-xs font-bold text-gray-700">{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Bundles */}
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Included Bundles ({p.bundles.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {p.bundles.map((b) => (
                    <span key={b} className={`inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-full ${s.badge}`}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Reference only. To assign modules to a specific tenant, use{' '}
        <a href="/admin/crm/tenants" className="text-indigo-600 hover:underline">Tenants → Edit</a>.
      </p>
    </div>
  );
}
