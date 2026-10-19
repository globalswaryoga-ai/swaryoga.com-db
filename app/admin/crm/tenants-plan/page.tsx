'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { MODULE_CATALOG, expandGroups, PLAN_DEFAULT_GROUPS } from '@/lib/tenant/moduleCatalog';
import PromoCodesManager from '@/components/admin/crm/PromoCodesManager';
import {
  Crown,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2,
  Plus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Tag,
  Users,
  HardDrive,
  MessageSquare,
  Radio,
  Zap,
  Clock,
  Edit3,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tenants Plan — full plan-tier manager. Every tier's name, description,
// bundles (add/remove), limits, prices, trial and promo are editable and
// persisted to Bunny Database crm_tenant_plans_sql.
// ---------------------------------------------------------------------------

interface Limits {
  maxLeads?: number;
  maxUsers?: number;
  maxStorageMB?: number;
  maxWhatsAppTemplates?: number;
  maxBroadcastsPerDay?: number;
  maxApiRequestsPerDay?: number;
}

interface Plan {
  tier: string;
  name: string;
  description?: string;
  limits: Limits;
  defaultGroups?: string[];
  monthlyPriceINR: number;
  annualPriceINR: number;
  quarterlyPriceINR?: number;
  halfYearlyPriceINR?: number;
  trialDays?: number;
  promoCode?: string;
  discountPercent?: number;
}

const STYLE: Record<string, { gradient: string; border: string; badge: string; accent: string }> = {
  free:         { gradient: 'from-slate-700 via-gray-800 to-zinc-900', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-800 border border-slate-300', accent: 'text-slate-600' },
  basic:        { gradient: 'from-sky-500 via-blue-600 to-indigo-700', border: 'border-sky-300', badge: 'bg-sky-50 text-sky-800 border border-sky-300', accent: 'text-sky-600' },
  starter:      { gradient: 'from-amber-500 via-orange-600 to-amber-700', border: 'border-amber-300', badge: 'bg-amber-50 text-amber-800 border border-amber-300', accent: 'text-amber-600' },
  growth:       { gradient: 'from-teal-500 via-emerald-600 to-green-700', border: 'border-emerald-300', badge: 'bg-emerald-50 text-emerald-800 border border-emerald-300', accent: 'text-emerald-600' },
  professional: { gradient: 'from-indigo-600 via-purple-600 to-pink-600', border: 'border-indigo-300', badge: 'bg-indigo-50 text-indigo-800 border border-indigo-300', accent: 'text-indigo-600' },
  enterprise:   { gradient: 'from-rose-600 via-pink-600 to-purple-800', border: 'border-rose-300', badge: 'bg-rose-50 text-rose-800 border border-rose-300', accent: 'text-rose-600' },
};
const styleFor = (tier: string) => STYLE[tier] || { gradient: 'from-violet-600 to-purple-800', border: 'border-violet-300', badge: 'bg-violet-50 text-violet-800 border border-violet-300', accent: 'text-violet-600' };

function fmtLeads(n?: number) {
  if (!n && n !== 0) return '—';
  if (n >= 999999) return 'Unlimited';
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}
function fmtMB(mb?: number) {
  if (!mb && mb !== 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

// ── Bundle picker (group + child modules) ──
function ModulePicker({ selected, onChange }: { selected: Set<string>; onChange: (n: Set<string>) => void }) {
  const toggleGroup = (groupKey: string, children: string[], on: boolean) => {
    const next = new Set(selected);
    if (on) { next.add(groupKey); children.forEach((c) => next.add(c)); }
    else { next.delete(groupKey); children.forEach((c) => next.delete(c)); }
    onChange(next);
  };
  const toggleChild = (groupKey: string, childKey: string, on: boolean) => {
    const next = new Set(selected);
    if (on) { next.add(childKey); next.add(groupKey); } else { next.delete(childKey); }
    onChange(next);
  };
  const enabledCount = MODULE_CATALOG.filter((g) => selected.has(g.key)).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Bundles ({enabledCount}/{MODULE_CATALOG.length})</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange(new Set(expandGroups(MODULE_CATALOG.map((g) => g.key))))} className="text-[11px] text-indigo-600 hover:underline">Select all</button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => onChange(new Set())} className="text-[11px] text-gray-500 hover:underline">Clear</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {MODULE_CATALOG.map((g) => {
          const groupOn = selected.has(g.key);
          const childKeys = g.children.map((c) => c.key);
          return (
            <div key={g.key} className={`rounded-lg border p-3 transition ${groupOn ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={groupOn} onChange={(e) => toggleGroup(g.key, childKeys, e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
                <span className="text-sm font-medium text-gray-800">{g.icon} {g.label}</span>
              </label>
              {g.children.length > 0 && (
                <div className="ml-6 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {g.children.map((c) => (
                    <label key={c.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={selected.has(c.key)} onChange={(e) => toggleChild(g.key, c.key, e.target.checked)} className="h-3.5 w-3.5 rounded accent-indigo-500" />
                      <span className="text-[12px] text-gray-600">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_PLAN: Plan = {
  tier: '', name: '', description: '', limits: { maxLeads: 0, maxUsers: 1, maxStorageMB: 100 },
  defaultGroups: [], monthlyPriceINR: 0, annualPriceINR: 0, quarterlyPriceINR: 0, halfYearlyPriceINR: 0,
  trialDays: 7, promoCode: '', discountPercent: 0,
};

// The full line-up always shown, so the grid is never empty even before the
// DB tenant_plans collection has been seeded. DB values override these.
const STATIC_DEFAULTS: Plan[] = [
  { tier: 'free',         name: 'Free',    description: 'Explore everything — 100 leads.',          limits: { maxLeads: 100,    maxUsers: 1,  maxStorageMB: 100 },    defaultGroups: PLAN_DEFAULT_GROUPS['free'] || [],         monthlyPriceINR: 0,    annualPriceINR: 0,     quarterlyPriceINR: 0,    halfYearlyPriceINR: 0,    trialDays: 0, promoCode: '', discountPercent: 0 },
  { tier: 'basic',        name: 'Basic',   description: 'Perfect for solo users getting started.', limits: { maxLeads: 1000,   maxUsers: 1,  maxStorageMB: 500 },    defaultGroups: PLAN_DEFAULT_GROUPS['basic'] || [],        monthlyPriceINR: 499,  annualPriceINR: 4500,  quarterlyPriceINR: 1350, halfYearlyPriceINR: 2400,  trialDays: 7, promoCode: '', discountPercent: 0 },
  { tier: 'starter',      name: 'Copper',  description: 'For small teams — 3 users, 5K leads.',     limits: { maxLeads: 5000,   maxUsers: 3,  maxStorageMB: 1000 },   defaultGroups: PLAN_DEFAULT_GROUPS['starter'] || [],      monthlyPriceINR: 999,  annualPriceINR: 9000,  quarterlyPriceINR: 2700, halfYearlyPriceINR: 5400,  trialDays: 7, promoCode: '', discountPercent: 0 },
  { tier: 'growth',       name: 'Silver',  description: 'Growing teams — 10 users, 15K leads.',     limits: { maxLeads: 15000,  maxUsers: 10, maxStorageMB: 5000 },   defaultGroups: PLAN_DEFAULT_GROUPS['growth'] || [],       monthlyPriceINR: 1999, annualPriceINR: 18000, quarterlyPriceINR: 5400, halfYearlyPriceINR: 10800, trialDays: 7, promoCode: '', discountPercent: 0 },
  { tier: 'professional', name: 'Golden',  description: 'Larger teams — 25 users, 50K leads.',      limits: { maxLeads: 50000,  maxUsers: 25, maxStorageMB: 20000 },  defaultGroups: PLAN_DEFAULT_GROUPS['professional'] || [], monthlyPriceINR: 2999, annualPriceINR: 25999, quarterlyPriceINR: 8100, halfYearlyPriceINR: 16200, trialDays: 7, promoCode: '', discountPercent: 0 },
  { tier: 'enterprise',   name: 'Diamond', description: 'Enterprise — 50 users, unlimited leads.',  limits: { maxLeads: 999999, maxUsers: 50, maxStorageMB: 100000 }, defaultGroups: PLAN_DEFAULT_GROUPS['enterprise'] || [],   monthlyPriceINR: 4999, annualPriceINR: 45000, quarterlyPriceINR: 14997, halfYearlyPriceINR: 29994, trialDays: 7, promoCode: '', discountPercent: 0 },
];

export default function TenantsPlanPage() {
  const router = useRouter();
  const token = useAuth();
  useEffect(() => { if (!checkIsSuperAdmin()) router.replace('/admin/crm'); }, [router]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Plan>(EMPTY_PLAN);
  const [groups, setGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const headers = useCallback(
    (): Record<string, string> => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants/plans');
      const data = await res.json().catch(() => ({}));
      const db: Plan[] = data?.data?.plans || [];
      const byTier = new Map(db.map((p) => [p.tier, p]));
      // Always show the full line-up; DB values override the static defaults.
      const merged = STATIC_DEFAULTS.map((base) => {
        const d = byTier.get(base.tier);
        return d ? { ...base, ...d, limits: { ...base.limits, ...(d.limits || {}) } } : base;
      });
      // Plus any custom DB plans not in the static line-up.
      const extras = db.filter((p) => !STATIC_DEFAULTS.some((b) => b.tier === p.tier));
      setPlans([...merged, ...extras]);
    } catch {
      setPlans(STATIC_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openNew = () => {
    setIsNew(true);
    setForm({ ...EMPTY_PLAN });
    setGroups(new Set());
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setIsNew(false);
    setForm({ ...p, limits: { ...p.limits } });
    setGroups(new Set(expandGroups(p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [])));
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const groupKeys = Array.from(groups).filter((k) => !k.includes('.'));
      const payload = {
        tier: form.tier, name: form.name, description: form.description,
        limits: form.limits, defaultGroups: groupKeys,
        monthlyPriceINR: form.monthlyPriceINR, annualPriceINR: form.annualPriceINR,
        quarterlyPriceINR: form.quarterlyPriceINR ?? 0, halfYearlyPriceINR: form.halfYearlyPriceINR ?? 0,
        trialDays: form.trialDays ?? 0,
        promoCode: (form.promoCode || '').trim().toUpperCase(),
        discountPercent: form.discountPercent ?? 0,
      };
      const res = await fetch('/api/admin/tenants/plans', {
        method: isNew ? 'POST' : 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.error || data?.message || 'Failed to save plan');
      setModalOpen(false);
      fetchPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tier: string) => {
    if (!confirm(`Delete the "${tier}" plan? Existing tenants keep their settings.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/tenants/plans?tier=${encodeURIComponent(tier)}`, { method: 'DELETE', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.error || data?.message || 'Failed to delete plan');
      fetchPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete plan');
    }
  };

  const bundlesFor = (p: Plan) => (p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [])
    .flatMap((gk) => { const g = MODULE_CATALOG.find((x) => x.key === gk); return g ? [g] : []; });

  const LIMIT_FIELDS: { key: keyof Limits; label: string }[] = [
    { key: 'maxLeads', label: 'Leads' },
    { key: 'maxUsers', label: 'Users' },
    { key: 'maxStorageMB', label: 'Storage MB' },
    { key: 'maxWhatsAppTemplates', label: 'WA Templates' },
    { key: 'maxBroadcastsPerDay', label: 'Broadcasts/day' },
    { key: 'maxApiRequestsPerDay', label: 'API req/day' },
  ];

  const PRICE_FIELDS: { key: keyof Plan; label: string }[] = [
    { key: 'monthlyPriceINR', label: '₹ / month' },
    { key: 'quarterlyPriceINR', label: '₹ / 3 months' },
    { key: 'halfYearlyPriceINR', label: '₹ / 6 months' },
    { key: 'annualPriceINR', label: '₹ / year' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Signature Gradient Top Accent ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 rounded-full" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Hero Header Banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-cyan-950 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-cyan-950/20 relative overflow-hidden border border-cyan-800/30">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">SaaS Plan Tiers</h1>
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Tier Catalog
                  </span>
                </div>
                <p className="text-sm text-cyan-200/80 mt-1.5 max-w-2xl leading-relaxed">
                  Manage module bundles, leads limits, storage quotas, billing cycles, and promo discounts for every tenant tier in Bunny Database.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/crm/tenants"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl transition text-sm font-semibold flex items-center gap-2 backdrop-blur-xs"
              >
                <Building2 className="w-4 h-4 text-cyan-300" />
                Tenants Directory
              </Link>
              <Link
                href="/admin/crm/tenants-hub"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl transition text-sm font-semibold flex items-center gap-2 backdrop-blur-xs"
              >
                <Layers className="w-4 h-4 text-cyan-300" />
                Tenants Hub
              </Link>
              <button
                onClick={openNew}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl transition text-sm font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Plan Tier
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">Loading plan tiers from Bunny Database…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => {
              const s = styleFor(p.tier);
              const bundles = bundlesFor(p);
              return (
                <div
                  key={p.tier}
                  className={`rounded-3xl border ${s.border} overflow-hidden flex flex-col shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 bg-white`}
                >
                  <div className={`bg-gradient-to-br ${s.gradient} px-6 pt-6 pb-5 text-white relative`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/80 bg-black/20 px-2.5 py-0.5 rounded-full">
                        {p.tier}
                      </span>
                      {p.trialDays ? (
                        <span className="text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                          {p.trialDays}d Trial
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-2xl font-black mb-1">{p.name}</h3>
                    <div className="text-3xl font-black mt-2">
                      {p.monthlyPriceINR === 0 ? 'Free' : `₹${p.monthlyPriceINR.toLocaleString()}`}
                      {p.monthlyPriceINR > 0 && <span className="text-sm font-normal text-white/75">/mo</span>}
                    </div>
                    {p.annualPriceINR > 0 && (
                      <p className="text-xs text-white/80 mt-1 font-medium">₹{p.annualPriceINR.toLocaleString()} billed annually</p>
                    )}
                    {p.description && <p className="text-xs text-white/70 mt-2 leading-relaxed">{p.description}</p>}
                  </div>

                  <div className="p-6 flex flex-col flex-1 bg-white">
                    <div className="grid grid-cols-3 gap-2.5 mb-5">
                      {[
                        { icon: '👥', label: 'Leads', val: fmtLeads(p.limits?.maxLeads) },
                        {
                          icon: '👤',
                          label: 'Users',
                          val: (p.limits?.maxUsers ?? 0) >= 999999 ? 'Unlim.' : String(p.limits?.maxUsers ?? '—'),
                        },
                        { icon: '💾', label: 'Storage', val: fmtMB(p.limits?.maxStorageMB) },
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                          <div className="text-base">{item.icon}</div>
                          <div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">{item.label}</div>
                          <div className="text-xs font-black text-gray-800 mt-0.5">{item.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Bundles Included ({bundles.length})
                        </span>
                      </div>
                      {bundles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {bundles.map((b) => (
                            <span
                              key={b.key}
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.badge}`}
                            >
                              <span>{b.icon}</span>
                              <span>{b.label}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No bundles assigned yet</p>
                      )}
                    </div>

                    <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded-xl py-2.5 hover:bg-indigo-100 transition flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Plan
                      </button>
                      <button
                        onClick={() => remove(p.tier)}
                        className="text-xs font-bold text-rose-600 border border-rose-200 rounded-xl px-3 py-2.5 hover:bg-rose-50 transition shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Promo Codes Section ── */}
        <div className="pt-4 border-t border-gray-200">
          <PromoCodesManager token={token} />
        </div>
      </div>

      {/* ── Full Plan editor modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold">{isNew ? 'New Plan Tier' : `Edit Plan — ${form.name || form.tier}`}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plan Name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Copper" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tier slug {isNew ? '' : '(locked)'}</label>
                  <input value={form.tier} disabled={!isNew} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono disabled:bg-gray-100 disabled:text-gray-400" placeholder="starter" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="For small teams — 3 users, 5K leads." />
              </div>

              {/* Bundles */}
              <ModulePicker selected={groups} onChange={setGroups} />

              {/* Limits */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Limits</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {LIMIT_FIELDS.map((lf) => (
                    <div key={lf.key}>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">{lf.label}</label>
                      <input type="number" value={(form.limits[lf.key] ?? 0) as number} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, [lf.key]: Number(e.target.value) || 0 } }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Prices */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Pricing</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRICE_FIELDS.map((pf) => (
                    <div key={pf.key}>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">{pf.label}</label>
                      <input type="number" value={(form[pf.key] as number) ?? 0} onChange={(e) => setForm((f) => ({ ...f, [pf.key]: Number(e.target.value) || 0 }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Trial + Promo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Trial (days)</label>
                  <input type="number" min={0} value={form.trialDays ?? 0} onChange={(e) => setForm((f) => ({ ...f, trialDays: Math.max(0, Number(e.target.value) || 0) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo code</label>
                  <input value={form.promoCode || ''} onChange={(e) => setForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono uppercase" placeholder="WELCOME50" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Discount (%)</label>
                  <input type="number" min={0} max={100} value={form.discountPercent ?? 0} onChange={(e) => setForm((f) => ({ ...f, discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 font-medium disabled:opacity-40">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.tier.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 font-semibold">
                {saving ? 'Saving…' : isNew ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
