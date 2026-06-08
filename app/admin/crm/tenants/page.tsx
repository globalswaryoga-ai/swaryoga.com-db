'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  MODULE_CATALOG,
  expandGroups,
  PLAN_DEFAULT_GROUPS,
} from '@/lib/tenant/moduleCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pricing {
  monthlyPriceINR?: number | null;
  storageIncludedMB?: number | null;
  extraStoragePriceINR?: number;
  promoCode?: string;
  promoDiscountPercent?: number;
  billingCycle?: BillingCycle;
}

type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: '3 Months',
  half_yearly: '6 Months',
  annual: 'Yearly',
};

interface Limits {
  maxLeads?: number;
  maxUsers?: number;
  maxStorageMB?: number;
}

interface Tenant {
  _id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerUserId: string;
  plan: string;
  status: string;
  dbName: string;
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  enabledModules: string[];
  moduleKeys?: string[];
  pricing?: Pricing;
  customLimits?: Limits;
  currentLeadCount: number;
  currentUserCount: number;
  currentStorageMB: number;
  subscriptionEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Plan {
  tier: string;
  name: string;
  description: string;
  limits: Record<string, number>;
  enabledModules: string[];
  defaultGroups?: string[];
  monthlyPriceINR: number;
  annualPriceINR: number;
  quarterlyPriceINR?: number;
  halfYearlyPriceINR?: number;
  trialDays?: number;
  promoCode?: string;
  discountPercent?: number;
  order?: number;
  isCustom?: boolean;
}

// ---------------------------------------------------------------------------
// Visual config
// ---------------------------------------------------------------------------

const PLAN_STYLE: Record<string, {
  gradient: string;
  border: string;
  headerText: string;
  badge: string;
  dot: string;
}> = {
  free:         { gradient: 'from-gray-400 to-gray-600',      border: 'border-gray-200',   headerText: 'text-white', badge: 'bg-gray-100 text-gray-700',      dot: 'bg-gray-400' },
  basic:        { gradient: 'from-sky-400 to-sky-600',        border: 'border-sky-200',    headerText: 'text-white', badge: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500' },
  starter:      { gradient: 'from-emerald-400 to-emerald-600',border: 'border-emerald-200',headerText: 'text-white', badge: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  growth:       { gradient: 'from-violet-500 to-violet-700',  border: 'border-violet-200', headerText: 'text-white', badge: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500' },
  professional: { gradient: 'from-amber-400 to-amber-600',    border: 'border-amber-200',  headerText: 'text-white', badge: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
  enterprise:   { gradient: 'from-rose-500 to-rose-700',      border: 'border-rose-200',   headerText: 'text-white', badge: 'bg-rose-100 text-rose-700',      dot: 'bg-rose-500' },
};

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  archived:  'bg-gray-100 text-gray-500',
};

const PLAN_OPTIONS = ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'];

function planStyle(tier: string) {
  return PLAN_STYLE[tier] || PLAN_STYLE.free;
}

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

function daysUntil(dateStr?: string) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

// ---------------------------------------------------------------------------
// ModulePicker (create / edit)
// ---------------------------------------------------------------------------

function ModulePicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggleGroup = (groupKey: string, children: string[], on: boolean) => {
    const next = new Set(selected);
    if (on) { next.add(groupKey); children.forEach((c) => next.add(c)); }
    else    { next.delete(groupKey); children.forEach((c) => next.delete(c)); }
    onChange(next);
  };

  const toggleChild = (groupKey: string, childKey: string, on: boolean) => {
    const next = new Set(selected);
    if (on) { next.add(childKey); next.add(groupKey); }
    else    { next.delete(childKey); }
    onChange(next);
  };

  const enabledCount = MODULE_CATALOG.filter((g) => selected.has(g.key)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Modules &amp; Pages ({enabledCount}/{MODULE_CATALOG.length})
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange(new Set(expandGroups(MODULE_CATALOG.map((g) => g.key))))} className="text-[11px] text-indigo-600 hover:underline">
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={() => onChange(new Set())} className="text-[11px] text-gray-500 hover:underline">
            Clear
          </button>
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
              {g.description && <p className="text-[11px] text-gray-400 ml-6 mt-0.5">{g.description}</p>}
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

// ---------------------------------------------------------------------------
// LimitsAndPricing (create / edit)
// ---------------------------------------------------------------------------

function LimitsAndPricing({
  limits,
  setLimits,
  pricing,
  setPricing,
}: {
  limits: Limits;
  setLimits: (l: Limits) => void;
  pricing: Pricing;
  setPricing: (p: Pricing) => void;
}) {
  const numField = (v: any) => (v === undefined || v === null ? '' : String(v));
  const cycle = (pricing.billingCycle || 'monthly') as BillingCycle;
  const months = CYCLE_MONTHS[cycle];
  const monthly = Number(pricing.monthlyPriceINR) || 0;
  const gross = monthly * months;
  const discountPct = Number(pricing.promoDiscountPercent) || 0;
  const net = Math.round(gross * (1 - discountPct / 100));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Leads limit</label>
          <input type="number" value={numField(limits.maxLeads)} onChange={(e) => setLimits({ ...limits, maxLeads: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Users limit</label>
          <input type="number" value={numField(limits.maxUsers)} onChange={(e) => setLimits({ ...limits, maxUsers: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 3" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Storage limit (MB)</label>
          <input type="number" value={numField(limits.maxStorageMB)} onChange={(e) => setLimits({ ...limits, maxStorageMB: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1000" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Extra storage (₹/mo)</label>
          <input type="number" value={numField(pricing.extraStoragePriceINR)} onChange={(e) => setPricing({ ...pricing, extraStoragePriceINR: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 30" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Tenant price (₹/mo)</label>
          <input type="number" value={numField(pricing.monthlyPriceINR)} onChange={(e) => setPricing({ ...pricing, monthlyPriceINR: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="overrides plan price" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Billing cycle</label>
          <select value={pricing.billingCycle || 'monthly'} onChange={(e) => setPricing({ ...pricing, billingCycle: e.target.value as BillingCycle })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((c) => <option key={c} value={c}>{CYCLE_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo code</label>
          <input value={pricing.promoCode || ''} onChange={(e) => setPricing({ ...pricing, promoCode: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="WELCOME50" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo discount (%)</label>
          <input type="number" min={0} max={100} value={numField(pricing.promoDiscountPercent)} onChange={(e) => setPricing({ ...pricing, promoDiscountPercent: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 20" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-gray-700">
        <span className="font-medium text-gray-500">Billed every {CYCLE_LABELS[cycle].toLowerCase()}:</span>
        <span>₹{monthly.toLocaleString()}/mo × {months} mo = <b>₹{gross.toLocaleString()}</b></span>
        {discountPct > 0 && <span className="text-rose-600">− {discountPct}% promo</span>}
        <span className="ml-auto text-sm font-bold text-indigo-700">Tenant pays ₹{net.toLocaleString()}</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Plan Card
// ---------------------------------------------------------------------------

function PlanCard({ p, onEdit, onDelete }: { p: Plan; onEdit: () => void; onDelete: () => void }) {
  const style = planStyle(p.tier);
  const groups = p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [];
  const bundles = groups.flatMap((gk) => {
    const grp = MODULE_CATALOG.find((g) => g.key === gk);
    return grp ? [grp] : [];
  });

  const prices = [
    { label: 'Mo', value: p.monthlyPriceINR },
    { label: '3M', value: p.quarterlyPriceINR },
    { label: '6M', value: p.halfYearlyPriceINR },
    { label: '1Y', value: p.annualPriceINR },
  ].filter((r) => r.value && r.value > 0);

  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}>
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${style.gradient} px-5 pt-5 pb-4`}>
        <div className="flex items-start justify-between mb-1">
          <span className={`text-[11px] font-bold uppercase tracking-widest ${style.headerText} opacity-80`}>{p.tier}</span>
          {p.trialDays ? <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">{p.trialDays}d trial</span> : null}
        </div>
        <h3 className={`text-xl font-bold ${style.headerText} mb-1`}>{p.name}</h3>
        <div className={`text-2xl font-extrabold ${style.headerText}`}>
          {p.monthlyPriceINR === 0 ? 'Free' : `₹${p.monthlyPriceINR.toLocaleString()}`}
          {p.monthlyPriceINR > 0 && <span className="text-sm font-normal opacity-70">/mo</span>}
        </div>
        {p.description && <p className={`text-xs ${style.headerText} opacity-70 mt-1`}>{p.description}</p>}
      </div>

      <div className="p-5 flex flex-col flex-1 bg-white">
        {/* Billing cycles */}
        {prices.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {prices.map((r) => (
              <div key={r.label} className="text-center bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                <div className="text-[10px] text-gray-400 font-medium">{r.label}</div>
                <div className="text-xs font-bold text-gray-700">₹{(r.value || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Limits */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: '👥', label: 'Leads', val: fmtLeads(p.limits.maxLeads) },
            { icon: '👤', label: 'Users', val: p.limits.maxUsers >= 999999 ? 'Unlim.' : String(p.limits.maxUsers || '—') },
            { icon: '💾', label: 'Storage', val: fmtMB(p.limits.maxStorageMB) },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-base">{item.icon}</div>
              <div className="text-[11px] text-gray-400">{item.label}</div>
              <div className="text-xs font-bold text-gray-700">{item.val}</div>
            </div>
          ))}
        </div>

        {/* Promo */}
        {(p.discountPercent ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-rose-600 font-medium">
            <span>🏷️</span>
            <span>{p.discountPercent}% off{p.promoCode ? ` · ${p.promoCode}` : ''}</span>
          </div>
        )}

        {/* Bundles */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Included Bundles</p>
          {bundles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {bundles.map((b) => (
                <span key={b.key} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${style.badge}`}>
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No bundles set</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
          <button onClick={onEdit} className="flex-1 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-50 transition">
            Edit Plan
          </button>
          <button onClick={onDelete} className="flex-1 text-xs font-semibold text-rose-500 border border-rose-200 rounded-lg py-2 hover:bg-rose-50 transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TenantsPage() {
  const router = useRouter();
  const token = useAuth();

  useEffect(() => { if (!checkIsSuperAdmin()) router.replace('/admin/crm'); }, [router]);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', ownerEmail: '', ownerUserId: '', plan: 'free', subscriptionEndsAt: '' });
  const [createModules, setCreateModules] = useState<Set<string>>(new Set());
  const [createLimits, setCreateLimits] = useState<Limits>({});
  const [createPricing, setCreatePricing] = useState<Pricing>({ billingCycle: 'monthly' });
  const [creating, setCreating] = useState(false);

  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editModules, setEditModules] = useState<Set<string>>(new Set());
  const [editLimits, setEditLimits] = useState<Limits>({});
  const [editPricing, setEditPricing] = useState<Pricing>({ billingCycle: 'monthly' });
  const [saving, setSaving] = useState(false);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planIsNew, setPlanIsNew] = useState(false);
  const [planForm, setPlanForm] = useState<Plan>({
    tier: '', name: '', description: '', limits: {}, enabledModules: [],
    defaultGroups: [], monthlyPriceINR: 0, annualPriceINR: 0, trialDays: 0,
    promoCode: '', discountPercent: 0,
  });
  const [planGroups, setPlanGroups] = useState<Set<string>>(new Set());
  const [savingPlan, setSavingPlan] = useState(false);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  // Super-admin: reset a tenant's login password (updates admin_users).
  const resetTenantPassword = useCallback(async (t: Tenant) => {
    const email = t.ownerEmail;
    if (!email) { alert('This tenant has no owner email on record.'); return; }
    const newPassword = window.prompt(`Set a new login password for ${email}\n(minimum 6 characters):`);
    if (newPassword === null) return; // cancelled
    if (newPassword.length < 6) { alert('Password must be at least 6 characters.'); return; }
    try {
      const res = await fetch('/api/admin/tenants/reset-password', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      alert(`✅ Password reset for ${email}. They can now log in with the new password.`);
    } catch (e) {
      alert(`❌ ${e instanceof Error ? e.message : 'Failed to reset password'}`);
    }
  }, [headers]);

  const fetchTenants = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);
      const res = await fetch(`/api/admin/tenants?${params}`, { headers: headers() });
      if (res.status === 401) {
        try { localStorage.removeItem('crm_token'); localStorage.removeItem('adminToken'); localStorage.removeItem('admin_token'); } catch {}
        setError('Session expired. Redirecting…');
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load tenants');
      setTenants(data.data?.tenants || []);
      setPagination(data.data?.pagination || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, planFilter, headers, router]);

  const fetchPlans = useCallback(() => {
    return fetch('/api/admin/tenants/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.data?.plans || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const openPlanNew = () => {
    setPlanIsNew(true);
    setPlanForm({ tier: '', name: '', description: '', limits: { maxLeads: 0, maxUsers: 1, maxStorageMB: 100 }, enabledModules: [], defaultGroups: [], monthlyPriceINR: 0, annualPriceINR: 0, trialDays: 7, promoCode: '', discountPercent: 0 });
    setPlanGroups(new Set());
    setPlanModalOpen(true);
  };

  const openPlanEdit = (p: Plan) => {
    setPlanIsNew(false);
    setPlanForm({ ...p });
    setPlanGroups(new Set(expandGroups(p.defaultGroups || [])));
    setPlanModalOpen(true);
  };

  const savePlan = async () => {
    setSavingPlan(true);
    setError('');
    try {
      const groupKeys = Array.from(planGroups).filter((k) => !k.includes('.'));
      const payload = {
        tier: planForm.tier, name: planForm.name, description: planForm.description,
        limits: planForm.limits, defaultGroups: groupKeys,
        monthlyPriceINR: planForm.monthlyPriceINR, annualPriceINR: planForm.annualPriceINR,
        quarterlyPriceINR: planForm.quarterlyPriceINR ?? 0, halfYearlyPriceINR: planForm.halfYearlyPriceINR ?? 0,
        trialDays: planForm.trialDays ?? 0,
        promoCode: (planForm.promoCode || '').trim().toUpperCase(),
        discountPercent: planForm.discountPercent ?? 0,
      };
      const res = await fetch('/api/admin/tenants/plans', {
        method: planIsNew ? 'POST' : 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save plan');
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (tier: string) => {
    if (!confirm(`Delete the "${tier}" plan? Existing tenants keep their settings.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/tenants/plans?tier=${encodeURIComponent(tier)}`, { method: 'DELETE', headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete plan');
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const applyPlanDefaults = (plan: string, target: 'create' | 'edit') => {
    const planDef = plans.find((p) => p.tier === plan);
    const groups = planDef?.defaultGroups?.length ? planDef.defaultGroups : (PLAN_DEFAULT_GROUPS[plan] || PLAN_DEFAULT_GROUPS.free);
    const keys = new Set(expandGroups(groups));
    const limits: Limits = planDef ? { maxLeads: planDef.limits.maxLeads, maxUsers: planDef.limits.maxUsers, maxStorageMB: planDef.limits.maxStorageMB } : {};
    const pricing: Pricing = { monthlyPriceINR: planDef?.monthlyPriceINR, billingCycle: 'monthly', promoCode: planDef?.promoCode || '', promoDiscountPercent: Number(planDef?.discountPercent) || 0 };
    if (target === 'create') {
      setCreateModules(keys); setCreateLimits(limits); setCreatePricing(pricing);
      const trialDays = Number(planDef?.trialDays) || 0;
      if (trialDays > 0) {
        const d = new Date(); d.setDate(d.getDate() + trialDays);
        setForm((f) => ({ ...f, subscriptionEndsAt: d.toISOString().slice(0, 10) }));
      }
    } else {
      setEditModules(keys); setEditLimits(limits);
      setEditPricing((p) => ({ ...p, monthlyPriceINR: pricing.monthlyPriceINR, promoCode: pricing.promoCode, promoDiscountPercent: pricing.promoDiscountPercent }));
    }
  };

  const renewalFromCycle = (cycle?: BillingCycle): string => {
    const months = CYCLE_MONTHS[(cycle || 'monthly') as BillingCycle];
    const d = new Date(); d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };

  const openCreate = () => {
    setForm({ name: '', slug: '', ownerEmail: '', ownerUserId: '', plan: 'free', subscriptionEndsAt: '' });
    applyPlanDefaults('free', 'create');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ...form, moduleKeys: Array.from(createModules), customLimits: createLimits, pricing: createPricing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant');
      setShowCreate(false); fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (t: Tenant) => {
    setEditTenant(t);
    setEditForm({ plan: t.plan, status: t.status, customDomain: t.customDomain || '', subscriptionEndsAt: t.subscriptionEndsAt ? String(t.subscriptionEndsAt).slice(0, 10) : '' });
    setEditModules(new Set(t.moduleKeys || []));
    setEditLimits(t.customLimits || {});
    setEditPricing(t.pricing || { billingCycle: 'monthly' });
  };

  const handleUpdate = async () => {
    if (!editTenant) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ slug: editTenant.slug, ...editForm, moduleKeys: Array.from(editModules), customLimits: editLimits, pricing: editPricing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update tenant');
      setEditTenant(null); fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  };

  if (!token) return null;

  // Summary stats
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const planCounts = tenants.reduce<Record<string, number>>((acc, t) => { acc[t.plan] = (acc[t.plan] || 0) + 1; return acc; }, {});

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Multi-tenant SaaS — organisations, plans, bundles &amp; limits.</p>
        </div>
        <button onClick={openCreate} className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-semibold shadow-sm">
          + New Tenant
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
      )}

      {/* ── Summary chips ── */}
      {tenants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {pagination?.total ?? tenants.length} total
          </span>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {activeCount} active
          </span>
          {Object.entries(planCounts).map(([plan, count]) => {
            const s = planStyle(plan);
            return (
              <span key={plan} className={`${s.badge} text-xs font-semibold px-3 py-1.5 rounded-full`}>
                {plan}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Plan Tiers ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Plan Tiers</h2>
          <button onClick={openPlanNew} className="text-sm font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition">
            + New Plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center text-gray-400 text-sm">
            No plans configured yet. Click &ldquo;+ New Plan&rdquo; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => (
              <PlanCard key={p.tier} p={p} onEdit={() => openPlanEdit(p)} onDelete={() => deletePlan(p.tier)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Tenant Table ── */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-800">All Tenants</h2>
          <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-1.5 text-sm bg-white">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-1.5 text-sm bg-white">
              <option value="">All Plans</option>
              {PLAN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center text-gray-400 text-sm">
            No tenants found. Click &ldquo;+ New Tenant&rdquo; to onboard your first organisation.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Organisation', 'Plan', 'Status', 'Bundles', 'Leads', 'Users', 'Renews', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {tenants.map((t) => {
                  const s = planStyle(t.plan);
                  const modCount = (t.moduleKeys || []).filter((k) => !k.includes('.')).length;
                  const days = daysUntil(t.subscriptionEndsAt);
                  const daysColor = days !== null && days <= 7 ? 'text-red-500 font-semibold' : days !== null && days <= 30 ? 'text-amber-600 font-medium' : 'text-gray-500';
                  return (
                    <tr key={t._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{t.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{t.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[t.status] || ''}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{modCount}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">{(t.currentLeadCount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{t.currentUserCount ?? 0}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {days !== null ? (
                          <span className={daysColor}>
                            {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d`}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(t)} className="text-xs font-semibold text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition whitespace-nowrap">
                            Edit
                          </button>
                          <button onClick={() => resetTenantPassword(t)} className="text-xs font-semibold text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition whitespace-nowrap" title="Reset login password">
                            🔑 Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded-lg disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>

      {/* ── Tenants — Bundles Overview ── */}
      {tenants.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tenants — Bundle Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => {
              const s = planStyle(t.plan);
              const groupKeys = (t.moduleKeys || []).filter((k) => !k.includes('.'));
              const bundles = groupKeys.flatMap((gk) => {
                const grp = MODULE_CATALOG.find((g) => g.key === gk);
                return grp ? [grp] : [];
              });
              const days = daysUntil(t.subscriptionEndsAt);
              return (
                <div key={t._id} className={`rounded-2xl border ${s.border} overflow-hidden shadow-sm`}>
                  <div className={`bg-gradient-to-r ${s.gradient} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <h3 className="font-bold text-white text-sm">{t.name}</h3>
                      <p className="text-white/70 text-[11px] font-mono">{t.slug}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-white/80 uppercase">{t.plan}</span>
                      <div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium`}>{t.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <div className="flex gap-3 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                      <span>👥 {(t.currentLeadCount ?? 0).toLocaleString()} leads</span>
                      <span>👤 {t.currentUserCount ?? 0} users</span>
                      {days !== null && (
                        <span className={days <= 7 ? 'text-red-500 font-semibold' : days <= 30 ? 'text-amber-600' : ''}>
                          🗓️ {days < 0 ? 'Expired' : `${days}d left`}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {bundles.length} Bundle{bundles.length !== 1 ? 's' : ''}
                    </p>
                    {bundles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {bundles.map((b) => (
                          <span key={b.key} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
                            {b.icon} {b.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No bundles enabled</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ====== Create Tenant Modal ====== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold">Onboard New Tenant</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Organisation Name</label>
                  <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Acme Yoga Studio" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Slug (URL-safe)</label>
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono" placeholder="acme-yoga" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Owner Email</label>
                  <input value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" type="email" placeholder="owner@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Owner User ID</label>
                  <input value={form.ownerUserId} onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="admin_user_id" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Plan (pre-fills modules &amp; limits)</label>
                <select value={form.plan} onChange={(e) => { setForm((f) => ({ ...f, plan: e.target.value })); applyPlanDefaults(e.target.value, 'create'); }} className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  {PLAN_OPTIONS.map((t) => {
                    const pd = plans.find((p) => p.tier === t);
                    return <option key={t} value={t}>{pd ? `${pd.name} — ₹${pd.monthlyPriceINR}/mo` : t}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subscription renews / ends on</label>
                <div className="flex gap-2">
                  <input type="date" value={form.subscriptionEndsAt} onChange={(e) => setForm((f) => ({ ...f, subscriptionEndsAt: e.target.value }))} className="border rounded-xl px-3 py-2 text-sm" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, subscriptionEndsAt: renewalFromCycle(createPricing.billingCycle) }))} className="px-3 py-2 text-xs border rounded-xl hover:bg-gray-50 text-indigo-600 font-medium">
                    Auto from cycle
                  </button>
                </div>
              </div>

              <ModulePicker selected={createModules} onChange={setCreateModules} />

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Limits &amp; Pricing</label>
                <LimitsAndPricing limits={createLimits} setLimits={setCreateLimits} pricing={createPricing} setPricing={setCreatePricing} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !form.name || !form.slug || !form.ownerEmail || !form.ownerUserId} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 font-semibold">
                {creating ? 'Creating…' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Tenant Modal ====== */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Edit Tenant — {editTenant.name}</h2>
                <p className="text-xs text-gray-400 font-mono">{editTenant.slug}</p>
              </div>
              <button onClick={() => setEditTenant(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plan</label>
                  <select value={editForm.plan || ''} onChange={(e) => { setEditForm((f: any) => ({ ...f, plan: e.target.value })); applyPlanDefaults(e.target.value, 'edit'); }} className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                    {PLAN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={editForm.status || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                    {['active', 'pending', 'suspended', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Domain</label>
                  <input value={editForm.customDomain || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, customDomain: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="crm.client.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Renews / ends on</label>
                  <div className="flex gap-1.5">
                    <input type="date" value={(editForm.subscriptionEndsAt || '').slice(0, 10)} onChange={(e) => setEditForm((f: any) => ({ ...f, subscriptionEndsAt: e.target.value }))} className="border rounded-xl px-3 py-2 text-sm flex-1" />
                    <button type="button" onClick={() => setEditForm((f: any) => ({ ...f, subscriptionEndsAt: renewalFromCycle(editPricing.billingCycle) }))} className="px-2 py-2 text-[11px] border rounded-xl hover:bg-gray-50 text-indigo-600 font-medium whitespace-nowrap">Auto</button>
                  </div>
                </div>
              </div>

              <ModulePicker selected={editModules} onChange={setEditModules} />

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Limits &amp; Pricing</label>
                <LimitsAndPricing limits={editLimits} setLimits={setEditLimits} pricing={editPricing} setPricing={setEditPricing} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setEditTenant(null)} className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 font-semibold">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Plan Editor Modal ====== */}
      {planModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold">{planIsNew ? 'New Plan Tier' : `Edit Plan — ${planForm.name}`}</h2>
              <button onClick={() => setPlanModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plan name</label>
                  <input value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Platinum" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tier slug</label>
                  <input value={planForm.tier} disabled={!planIsNew} onChange={(e) => setPlanForm((f) => ({ ...f, tier: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono disabled:bg-gray-100 disabled:text-gray-400" placeholder="platinum" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <input value={planForm.description} onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="For large teams — unlimited everything." />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Pricing per cycle (₹)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Monthly', key: 'monthlyPriceINR' as const },
                    { label: '3-Month', key: 'quarterlyPriceINR' as const },
                    { label: '6-Month', key: 'halfYearlyPriceINR' as const },
                    { label: '1-Year', key: 'annualPriceINR' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
                      <input type="number" value={(planForm as any)[key] ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Leads</label>
                  <input type="number" value={planForm.limits.maxLeads ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxLeads: Number(e.target.value) || 0 } }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Users</label>
                  <input type="number" value={planForm.limits.maxUsers ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxUsers: Number(e.target.value) || 0 } }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Storage MB</label>
                  <input type="number" value={planForm.limits.maxStorageMB ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxStorageMB: Number(e.target.value) || 0 } }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Trial days</label>
                  <input type="number" min={0} value={planForm.trialDays ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, trialDays: Math.max(0, Number(e.target.value) || 0) }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Promo &amp; Discount</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Promo code</label>
                    <input value={planForm.promoCode || ''} onChange={(e) => setPlanForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))} className="w-full border rounded-xl px-3 py-2 text-sm font-mono uppercase" placeholder="WELCOME50" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Discount (%)</label>
                    <input type="number" min={0} max={100} value={planForm.discountPercent ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="0" />
                  </div>
                </div>
                {Number(planForm.discountPercent) > 0 && Number(planForm.monthlyPriceINR) > 0 && (
                  <p className="mt-2 text-xs text-emerald-700 font-medium">
                    After {planForm.discountPercent}% off: ₹{Math.round(Number(planForm.monthlyPriceINR) * (1 - Number(planForm.discountPercent) / 100)).toLocaleString()}/mo
                    {planForm.promoCode ? ` · code ${planForm.promoCode}` : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Default module bundles</label>
                <ModulePicker selected={planGroups} onChange={setPlanGroups} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setPlanModalOpen(false)} className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={savePlan} disabled={savingPlan || !planForm.name || !planForm.tier} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 font-semibold">
                {savingPlan ? 'Saving…' : planIsNew ? 'Create Plan' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
