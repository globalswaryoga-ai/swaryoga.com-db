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

// Months per cycle — used to compute the amount billed each cycle.
const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly (1 mo)',
  quarterly: '3 Months',
  half_yearly: '6 Months',
  annual: 'Yearly (12 mo)',
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-500',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-sky-100 text-sky-700',
  starter: 'bg-indigo-100 text-indigo-700',
  growth: 'bg-purple-100 text-purple-700',
  professional: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-rose-100 text-rose-700',
};

const PLAN_OPTIONS = ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'];

// ---------------------------------------------------------------------------
// Module bundle picker (shared by Create + Edit)
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
    if (on) {
      next.add(groupKey);
      children.forEach((c) => next.add(c));
    } else {
      next.delete(groupKey);
      children.forEach((c) => next.delete(c));
    }
    onChange(next);
  };

  const toggleChild = (groupKey: string, childKey: string, on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(childKey);
      next.add(groupKey); // a selected child implies the group is on
    } else {
      next.delete(childKey);
    }
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
          <button
            type="button"
            onClick={() => onChange(new Set(expandGroups(MODULE_CATALOG.map((g) => g.key))))}
            className="text-[11px] text-indigo-600 hover:underline"
          >
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-[11px] text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {MODULE_CATALOG.map((g) => {
          const groupOn = selected.has(g.key);
          const childKeys = g.children.map((c) => c.key);
          return (
            <div
              key={g.key}
              className={`rounded-lg border p-3 transition ${
                groupOn ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupOn}
                  onChange={(e) => toggleGroup(g.key, childKeys, e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-800">
                  {g.icon} {g.label}
                </span>
              </label>
              {g.description && (
                <p className="text-[11px] text-gray-400 ml-6 mt-0.5">{g.description}</p>
              )}

              {g.children.length > 0 && (
                <div className="ml-6 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {g.children.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.key)}
                        onChange={(e) => toggleChild(g.key, c.key, e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-indigo-500"
                      />
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
// Limits + Pricing fields (shared)
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

  // Live billing preview: monthly price × months in cycle, minus promo discount.
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
        <input
          type="number"
          value={numField(limits.maxLeads)}
          onChange={(e) => setLimits({ ...limits, maxLeads: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. 5000"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Users limit</label>
        <input
          type="number"
          value={numField(limits.maxUsers)}
          onChange={(e) => setLimits({ ...limits, maxUsers: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. 3"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Storage limit (MB)</label>
        <input
          type="number"
          value={numField(limits.maxStorageMB)}
          onChange={(e) => setLimits({ ...limits, maxStorageMB: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. 1000"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Extra storage price (₹/mo)</label>
        <input
          type="number"
          value={numField(pricing.extraStoragePriceINR)}
          onChange={(e) => setPricing({ ...pricing, extraStoragePriceINR: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. 30"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Tenant price (₹/mo)</label>
        <input
          type="number"
          value={numField(pricing.monthlyPriceINR)}
          onChange={(e) => setPricing({ ...pricing, monthlyPriceINR: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="overrides plan price"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Billing cycle</label>
        <select
          value={pricing.billingCycle || 'monthly'}
          onChange={(e) => setPricing({ ...pricing, billingCycle: e.target.value as BillingCycle })}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        >
          {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((c) => (
            <option key={c} value={c}>{CYCLE_LABELS[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo code</label>
        <input
          value={pricing.promoCode || ''}
          onChange={(e) => setPricing({ ...pricing, promoCode: e.target.value.toUpperCase() })}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase"
          placeholder="WELCOME50"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo discount (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={numField(pricing.promoDiscountPercent)}
          onChange={(e) => setPricing({ ...pricing, promoDiscountPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. 20"
        />
      </div>
    </div>

    {/* Live billing preview */}
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-gray-700">
      <span className="font-medium text-gray-500">Billed every {CYCLE_LABELS[cycle].toLowerCase()}:</span>
      <span>₹{monthly.toLocaleString()}/mo × {months} mo = <b>₹{gross.toLocaleString()}</b></span>
      {discountPct > 0 && (
        <span className="text-rose-600">− {discountPct}% promo</span>
      )}
      <span className="ml-auto text-sm font-bold text-indigo-700">Tenant pays ₹{net.toLocaleString()}</span>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
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

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerUserId: '',
    plan: 'free',
    subscriptionEndsAt: '',
  });
  const [createModules, setCreateModules] = useState<Set<string>>(new Set());
  const [createLimits, setCreateLimits] = useState<Limits>({});
  const [createPricing, setCreatePricing] = useState<Pricing>({ billingCycle: 'monthly' });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editModules, setEditModules] = useState<Set<string>>(new Set());
  const [editLimits, setEditLimits] = useState<Limits>({});
  const [editPricing, setEditPricing] = useState<Pricing>({ billingCycle: 'monthly' });
  const [saving, setSaving] = useState(false);

  // Plan tier editor
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

  const fetchTenants = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/admin/tenants?${params}`, { headers: headers() });
      // Expired/invalid token → every authed call 401s. Clear the stale token
      // and send the user to log in again instead of showing a dead page.
      if (res.status === 401) {
        try {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin_token');
        } catch {}
        setError('Your session has expired. Redirecting to login…');
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

  // ── Plan tier CRUD ──
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
      // Group keys only (children are implied/expanded from groups).
      const groupKeys = Array.from(planGroups).filter((k) => !k.includes('.'));
      const payload = {
        tier: planForm.tier,
        name: planForm.name,
        description: planForm.description,
        limits: planForm.limits,
        defaultGroups: groupKeys,
        monthlyPriceINR: planForm.monthlyPriceINR,
        annualPriceINR: planForm.annualPriceINR,
        quarterlyPriceINR: planForm.quarterlyPriceINR ?? 0,
        halfYearlyPriceINR: planForm.halfYearlyPriceINR ?? 0,
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
    if (!confirm(`Delete the "${tier}" plan? Existing tenants keep their settings; this only removes the tier from the reference list.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/tenants/plans?tier=${encodeURIComponent(tier)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete plan');
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // When the plan changes in the Create form, pre-fill module bundles + limits.
  const applyPlanDefaults = (plan: string, target: 'create' | 'edit') => {
    const planDef = plans.find((p) => p.tier === plan);
    // Prefer the (editable) plan's saved bundles; fall back to static defaults.
    const groups = planDef?.defaultGroups?.length
      ? planDef.defaultGroups
      : (PLAN_DEFAULT_GROUPS[plan] || PLAN_DEFAULT_GROUPS.free);
    const keys = new Set(expandGroups(groups));
    const limits: Limits = planDef
      ? {
          maxLeads: planDef.limits.maxLeads,
          maxUsers: planDef.limits.maxUsers,
          maxStorageMB: planDef.limits.maxStorageMB,
        }
      : {};
    const pricing: Pricing = {
      monthlyPriceINR: planDef?.monthlyPriceINR ?? undefined,
      billingCycle: 'monthly',
      // Carry the plan-tier's promo/discount down to the tenant automatically.
      promoCode: planDef?.promoCode || '',
      promoDiscountPercent: Number(planDef?.discountPercent) || 0,
    };
    if (target === 'create') {
      setCreateModules(keys);
      setCreateLimits(limits);
      setCreatePricing(pricing);
      // Pre-fill the subscription end date from the plan's free-trial length.
      const trialDays = Number(planDef?.trialDays) || 0;
      if (trialDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + trialDays);
        setForm((f) => ({ ...f, subscriptionEndsAt: d.toISOString().slice(0, 10) }));
      }
    } else {
      setEditModules(keys);
      setEditLimits(limits);
      setEditPricing((p) => ({
        ...p,
        monthlyPriceINR: pricing.monthlyPriceINR,
        promoCode: pricing.promoCode,
        promoDiscountPercent: pricing.promoDiscountPercent,
      }));
    }
  };

  const openCreate = () => {
    setForm({ name: '', slug: '', ownerEmail: '', ownerUserId: '', plan: 'free', subscriptionEndsAt: '' });
    applyPlanDefaults('free', 'create');
    setShowCreate(true);
  };

  // Compute a YYYY-MM-DD renewal date = today + N months for the given cycle.
  const renewalFromCycle = (cycle?: BillingCycle): string => {
    const months = CYCLE_MONTHS[(cycle || 'monthly') as BillingCycle];
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...form,
          moduleKeys: Array.from(createModules),
          customLimits: createLimits,
          pricing: createPricing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant');
      setShowCreate(false);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (t: Tenant) => {
    setEditTenant(t);
    setEditForm({
      plan: t.plan,
      status: t.status,
      customDomain: t.customDomain || '',
      subscriptionEndsAt: t.subscriptionEndsAt ? String(t.subscriptionEndsAt).slice(0, 10) : '',
    });
    setEditModules(new Set(t.moduleKeys || []));
    setEditLimits(t.customLimits || {});
    setEditPricing(t.pricing || { billingCycle: 'monthly' });
  };

  const handleUpdate = async () => {
    if (!editTenant) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          slug: editTenant.slug,
          ...editForm,
          moduleKeys: Array.from(editModules),
          customLimits: editLimits,
          pricing: editPricing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update tenant');
      setEditTenant(null);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  if (!token) return null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-tenant SaaS administration — manage organisations, plans, modules, limits &amp; pricing.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          + New Tenant
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tenants…</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No tenants found. Click &ldquo;+ New Tenant&rdquo; to onboard your first organisation.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Modules</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Leads</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Users</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tenants.map((t) => {
                const modCount = (t.moduleKeys || []).filter((k) => !k.includes('.')).length;
                return (
                  <tr key={t._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] || ''}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{modCount}</td>
                    <td className="px-4 py-3 text-gray-600">{(t.currentLeadCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{t.currentUserCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* ====== Create Tenant Modal ====== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold">Onboard New Tenant</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Organisation Name</label>
                  <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Acme Yoga Studio" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL-safe)</label>
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="acme-yoga" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner Email</label>
                  <input value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="owner@example.com" type="email" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner User ID</label>
                  <input value={form.ownerUserId} onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="admin_user_id" />
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan (pre-fills modules &amp; limits)</label>
                <select
                  value={form.plan}
                  onChange={(e) => { setForm((f) => ({ ...f, plan: e.target.value })); applyPlanDefaults(e.target.value, 'create'); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {PLAN_OPTIONS.map((t) => {
                    const pd = plans.find((p) => p.tier === t);
                    return <option key={t} value={t}>{pd ? `${pd.name} — ₹${pd.monthlyPriceINR}/mo` : t}</option>;
                  })}
                </select>
              </div>

              {/* Renewal date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subscription renews / ends on</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={form.subscriptionEndsAt}
                    onChange={(e) => setForm((f) => ({ ...f, subscriptionEndsAt: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, subscriptionEndsAt: renewalFromCycle(createPricing.billingCycle) }))}
                    className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50 text-indigo-600"
                  >
                    Auto from cycle ({CYCLE_LABELS[(createPricing.billingCycle || 'monthly') as BillingCycle]})
                  </button>
                </div>
              </div>

              {/* Modules */}
              <ModulePicker selected={createModules} onChange={setCreateModules} />

              {/* Limits + Pricing */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Limits &amp; Pricing</label>
                <LimitsAndPricing limits={createLimits} setLimits={setCreateLimits} pricing={createPricing} setPricing={setCreatePricing} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.slug || !form.ownerEmail || !form.ownerUserId}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Tenant Modal ====== */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Edit Tenant</h2>
                <p className="text-xs text-gray-400 font-mono">{editTenant.slug}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                  <select
                    value={editForm.plan || ''}
                    onChange={(e) => { setEditForm((f: any) => ({ ...f, plan: e.target.value })); applyPlanDefaults(e.target.value, 'edit'); }}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {PLAN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {['active', 'pending', 'suspended', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Custom Domain</label>
                  <input
                    value={editForm.customDomain || ''}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, customDomain: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="crm.client.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subscription renews / ends on</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={(editForm.subscriptionEndsAt || '').slice(0, 10)}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, subscriptionEndsAt: e.target.value }))}
                      className="border rounded-lg px-3 py-2 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setEditForm((f: any) => ({ ...f, subscriptionEndsAt: renewalFromCycle(editPricing.billingCycle) }))}
                      className="px-2 py-2 text-[11px] border rounded-lg hover:bg-gray-50 text-indigo-600 whitespace-nowrap"
                    >
                      Auto
                    </button>
                  </div>
                </div>
              </div>

              {/* Modules */}
              <ModulePicker selected={editModules} onChange={setEditModules} />

              {/* Limits + Pricing */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Limits &amp; Pricing</label>
                <LimitsAndPricing limits={editLimits} setLimits={setEditLimits} pricing={editPricing} setPricing={setEditPricing} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setEditTenant(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Plans Reference Card ====== */}
      {plans.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Plan Tiers Reference</h2>
            <button
              onClick={openPlanNew}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              + New Plan
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => {
              const groups = p.defaultGroups || (PLAN_DEFAULT_GROUPS[p.tier] || []);
              const groupModules = groups.flatMap((gk) => {
                const grp = MODULE_CATALOG.find((g) => g.key === gk);
                return grp ? [{ label: grp.label, icon: grp.icon }] : [];
              });

              return (
                <div
                  key={p.tier}
                  className={`border rounded-xl p-5 flex flex-col ${p.tier === 'enterprise' ? 'border-rose-300 bg-rose-50/30' : 'bg-white'}`}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PLAN_COLORS[p.tier] || 'bg-gray-100 text-gray-700'}`}>{p.name}</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {p.monthlyPriceINR === 0 ? '₹0' : `₹${p.monthlyPriceINR.toLocaleString()}/mo`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{p.description}</p>
                  </div>

                  {/* Basic info */}
                  <div className="text-xs text-gray-600 mb-3 space-y-0.5 pb-3 border-b border-gray-200">
                    <div>Leads: {p.limits.maxLeads?.toLocaleString()}</div>
                    <div>Users: {p.limits.maxUsers}</div>
                    <div>Storage: {p.limits.maxStorageMB?.toLocaleString()} MB</div>
                    {p.trialDays ? <div className="text-emerald-600 font-medium">🎁 {p.trialDays}-day free trial</div> : null}
                    {p.discountPercent ? <div className="text-rose-600 font-medium">🏷️ {p.discountPercent}% off{p.promoCode ? ` (${p.promoCode})` : ''}</div> : null}
                  </div>

                  {/* Bundles */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Bundles:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {groupModules.length > 0 ? (
                        groupModules.map((m, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked disabled className="h-4 w-4 rounded" />
                            <span className="text-gray-700">{m.icon} {m.label}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No bundles included</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openPlanEdit(p)}
                      className="flex-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded py-1.5 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePlan(p.tier)}
                      className="flex-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded py-1.5 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== All Tenants with Their Plans & Bundles ====== */}
      {tenants.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">All Tenants — Plans & Bundles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => {
              const tenantPlan = plans.find((p) => p.tier === t.plan);
              const moduleKeys = t.moduleKeys || [];
              const groupKeys = moduleKeys.filter((k) => !k.includes('.'));
              const tenantModules = groupKeys.flatMap((gk) => {
                const grp = MODULE_CATALOG.find((g) => g.key === gk);
                return grp ? [{ label: grp.label, icon: grp.icon }] : [];
              });

              return (
                <div key={t._id} className="border rounded-xl p-4 bg-white">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm">{t.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] || ''}`}>
                        {t.plan}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                  </div>

                  <div className="text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                    <div>Leads: {(t.currentLeadCount ?? 0).toLocaleString()}</div>
                    <div>Users: {t.currentUserCount ?? 0}</div>
                    <div>Status: <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>{t.status}</span></div>
                  </div>

                  {/* Bundles for this tenant */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Enabled Bundles ({tenantModules.length}):</p>
                    <div className="space-y-1">
                      {tenantModules.length > 0 ? (
                        tenantModules.map((m, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked disabled className="h-4 w-4 rounded" />
                            <span className="text-gray-700">{m.icon} {m.label}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No bundles enabled</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== Plan Editor Modal ====== */}
      {planModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold">{planIsNew ? 'New Plan Tier' : `Edit Plan — ${planForm.name}`}</h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plan name</label>
                  <input
                    value={planForm.name}
                    onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Platinum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tier slug</label>
                  <input
                    value={planForm.tier}
                    disabled={!planIsNew}
                    onChange={(e) => setPlanForm((f) => ({ ...f, tier: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="platinum"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={planForm.description}
                  onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="For large teams — unlimited everything."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Pricing per cycle (₹) — leave 0 to auto-derive from monthly</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Monthly</label>
                    <input type="number" value={planForm.monthlyPriceINR} onChange={(e) => setPlanForm((f) => ({ ...f, monthlyPriceINR: Number(e.target.value) || 0 }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">3-Month</label>
                    <input type="number" value={planForm.quarterlyPriceINR ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, quarterlyPriceINR: Number(e.target.value) || 0 }))} placeholder={`${(planForm.monthlyPriceINR || 0) * 3}`} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">6-Month</label>
                    <input type="number" value={planForm.halfYearlyPriceINR ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, halfYearlyPriceINR: Number(e.target.value) || 0 }))} placeholder={`${(planForm.monthlyPriceINR || 0) * 6}`} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">1-Year</label>
                    <input type="number" value={planForm.annualPriceINR} onChange={(e) => setPlanForm((f) => ({ ...f, annualPriceINR: Number(e.target.value) || 0 }))} placeholder={`${(planForm.monthlyPriceINR || 0) * 12}`} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Leads</label>
                  <input type="number" value={planForm.limits.maxLeads ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxLeads: Number(e.target.value) || 0 } }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Users</label>
                  <input type="number" value={planForm.limits.maxUsers ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxUsers: Number(e.target.value) || 0 } }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Storage MB</label>
                  <input type="number" value={planForm.limits.maxStorageMB ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, limits: { ...f.limits, maxStorageMB: Number(e.target.value) || 0 } }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Free trial (days)</label>
                  <input type="number" min={0} value={planForm.trialDays ?? 0} onChange={(e) => setPlanForm((f) => ({ ...f, trialDays: Math.max(0, Number(e.target.value) || 0) }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 7" />
                </div>
              </div>

              {/* Promo & Discount */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Promo &amp; Discount</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Promo code</label>
                    <input
                      value={planForm.promoCode || ''}
                      onChange={(e) => setPlanForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase"
                      placeholder="e.g. WELCOME50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Discount (%)</label>
                    <input
                      type="number" min={0} max={100}
                      value={planForm.discountPercent ?? 0}
                      onChange={(e) => setPlanForm((f) => ({ ...f, discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
                {Number(planForm.discountPercent) > 0 && Number(planForm.monthlyPriceINR) > 0 && (
                  <p className="mt-2 text-xs text-emerald-700">
                    After {planForm.discountPercent}% off: ₹{Math.round(Number(planForm.monthlyPriceINR) * (1 - Number(planForm.discountPercent) / 100)).toLocaleString()}/mo
                    {planForm.promoCode ? ` · code ${planForm.promoCode}` : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Default module bundles</label>
                <ModulePicker selected={planGroups} onChange={setPlanGroups} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setPlanModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={savePlan}
                disabled={savingPlan || !planForm.name || !planForm.tier}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
              >
                {savingPlan ? 'Saving…' : planIsNew ? 'Create Plan' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
