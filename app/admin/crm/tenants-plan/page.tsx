'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';

// ---------------------------------------------------------------------------
// Tenants Plan — the full bundle line-up (Basic · Copper · Silver · Golden ·
// Diamond, plus Free). Prices, limits and names are DB-backed (tenant_plans,
// seeded from lib/tenant/plans.ts) and editable here by super-admins. Bundles
// are inclusive — each tier adds to the one before it.
// ---------------------------------------------------------------------------

interface Limits {
  maxLeads: number;
  maxUsers: number;
  maxStorageMB: number;
  maxWhatsAppTemplates?: number;
  maxBroadcastsPerDay?: number;
  maxApiRequestsPerDay?: number;
}

interface PlanRow {
  tier: string;        // internal tier key used by the plans API
  styleKey: string;    // visual style key
  name: string;        // display name (editable)
  tagline: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  limits: Limits;
  bundles: string[];
}

// Readable bundle labels, built inclusively per tier.
const FREE = ['Lead Management (CRM)', 'Chatbot'];
const BASIC = [...FREE, 'WhatsApp API', 'Broadcasts'];
const COPPER = [...BASIC, 'Meta Lead Forms'];
const SILVER = [...COPPER, 'AI Voice Calls', 'Payments', 'Certificates', 'Community'];
const GOLDEN = [...SILVER, 'Workshops', 'Life Planner', 'Analytics', 'Custom Domain'];
const DIAMOND = [...GOLDEN, 'Tally Integration', 'API Access'];

// Defaults (overridden by DB values on load).
const DEFAULT_PLANS: PlanRow[] = [
  { tier: 'free',         styleKey: 'free',    name: 'Free',    tagline: 'Explore everything — 100 leads.',          monthlyPriceINR: 0,    annualPriceINR: 0,     limits: { maxLeads: 100,    maxUsers: 1,  maxStorageMB: 100 },    bundles: FREE },
  { tier: 'basic',        styleKey: 'basic',   name: 'Basic',   tagline: 'Perfect for solo users getting started.', monthlyPriceINR: 499,  annualPriceINR: 4500,  limits: { maxLeads: 1000,   maxUsers: 1,  maxStorageMB: 500 },    bundles: BASIC },
  { tier: 'starter',      styleKey: 'copper',  name: 'Copper',  tagline: 'For small teams — 3 users, 5K leads.',     monthlyPriceINR: 999,  annualPriceINR: 9000,  limits: { maxLeads: 5000,   maxUsers: 3,  maxStorageMB: 1000 },   bundles: COPPER },
  { tier: 'growth',       styleKey: 'silver',  name: 'Silver',  tagline: 'Growing teams — 10 users, 15K leads.',     monthlyPriceINR: 1999, annualPriceINR: 18000, limits: { maxLeads: 15000,  maxUsers: 10, maxStorageMB: 5000 },   bundles: SILVER },
  { tier: 'professional', styleKey: 'golden',  name: 'Golden',  tagline: 'Larger teams — 25 users, 50K leads.',      monthlyPriceINR: 2999, annualPriceINR: 25999, limits: { maxLeads: 50000,  maxUsers: 25, maxStorageMB: 20000 },  bundles: GOLDEN },
  { tier: 'enterprise',   styleKey: 'diamond', name: 'Diamond', tagline: 'Enterprise — 50 users, unlimited leads.',  monthlyPriceINR: 4999, annualPriceINR: 45000, limits: { maxLeads: 999999, maxUsers: 50, maxStorageMB: 100000 }, bundles: DIAMOND },
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
  const token = useAuth();
  useEffect(() => { if (!checkIsSuperAdmin()) router.replace('/admin/crm'); }, [router]);

  const [plans, setPlans] = useState<PlanRow[]>(DEFAULT_PLANS);
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load DB-backed plan values (name / prices / limits) over the defaults.
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tenants/plans');
      const data = await res.json().catch(() => ({}));
      const dbPlans: any[] = data?.data?.plans || [];
      if (!dbPlans.length) return;
      const byTier = new Map(dbPlans.map((p) => [p.tier, p]));
      setPlans(DEFAULT_PLANS.map((base) => {
        const db = byTier.get(base.tier);
        if (!db) return base;
        return {
          ...base,
          name: db.name || base.name,
          monthlyPriceINR: db.monthlyPriceINR ?? base.monthlyPriceINR,
          annualPriceINR: db.annualPriceINR ?? base.annualPriceINR,
          limits: { ...base.limits, ...(db.limits || {}) },
        };
      }));
    } catch { /* keep defaults */ }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tier: edit.tier,
          name: edit.name.trim(),
          monthlyPriceINR: edit.monthlyPriceINR,
          annualPriceINR: edit.annualPriceINR,
          limits: edit.limits, // full object so other limit fields aren't wiped
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Failed to save plan');
      setPlans((prev) => prev.map((p) => p.tier === edit.tier ? { ...edit } : p));
      setEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const numInput = (v: number) => (Number.isFinite(v) ? String(v) : '');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          The full plan line-up &mdash; Basic, Copper, Silver, Golden &amp; Diamond. Edit a tier&rsquo;s name, price &amp; limits; changes are saved and used across tenant onboarding.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((p) => {
          const s = STYLE[p.styleKey] || STYLE.free;
          return (
            <div key={p.tier} className={`rounded-2xl border ${s.border} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}>
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${s.gradient} px-5 pt-5 pb-4 text-white relative`}>
                <button
                  onClick={() => setEdit({ ...p, limits: { ...p.limits } })}
                  className="absolute top-4 right-4 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition"
                  title="Edit plan"
                >
                  ✏️ Edit
                </button>
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{p.styleKey}</span>
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <div className="text-2xl font-extrabold">
                  {p.monthlyPriceINR === 0 ? 'Free' : `₹${p.monthlyPriceINR.toLocaleString()}`}
                  {p.monthlyPriceINR > 0 && <span className="text-sm font-normal opacity-70">/mo</span>}
                </div>
                {p.annualPriceINR > 0 && <p className="text-xs opacity-80 mt-0.5">₹{p.annualPriceINR.toLocaleString()}/yr</p>}
                <p className="text-xs opacity-70 mt-1">{p.tagline}</p>
              </div>

              <div className="p-5 flex flex-col flex-1 bg-white">
                {/* Limits */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: '👥', label: 'Leads', val: fmtLeads(p.limits.maxLeads) },
                    { icon: '👤', label: 'Users', val: String(p.limits.maxUsers) },
                    { icon: '💾', label: 'Storage', val: fmtMB(p.limits.maxStorageMB) },
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
        To assign modules to a specific tenant, use{' '}
        <a href="/admin/crm/tenants" className="text-indigo-600 hover:underline">Tenants → Edit</a>.
      </p>

      {/* ── Edit Plan modal ── */}
      {edit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">Edit Plan — {edit.styleKey}</h3>
              <button onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Plan name</label>
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Copper" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price ₹/mo</label>
                  <input type="number" value={numInput(edit.monthlyPriceINR)} onChange={(e) => setEdit({ ...edit, monthlyPriceINR: Number(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price ₹/yr</label>
                  <input type="number" value={numInput(edit.annualPriceINR)} onChange={(e) => setEdit({ ...edit, annualPriceINR: Number(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leads</label>
                  <input type="number" value={numInput(edit.limits.maxLeads)} onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, maxLeads: Number(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Users</label>
                  <input type="number" value={numInput(edit.limits.maxUsers)} onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, maxUsers: Number(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Storage MB</label>
                  <input type="number" value={numInput(edit.limits.maxStorageMB)} onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, maxStorageMB: Number(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Bundles are managed per-tenant in Tenants → Edit. This page edits the plan&rsquo;s headline name, price &amp; limits.</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setEdit(null)} disabled={saving} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 font-medium disabled:opacity-40">Cancel</button>
              <button onClick={saveEdit} disabled={saving || !edit.name.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
