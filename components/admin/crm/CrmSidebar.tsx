'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, X, ChevronLeft, ChevronRight, Zap, Clock } from 'lucide-react';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { sectionConfigs, findSectionForPath, type SectionConfig } from './crmNavConfig';
import { MODULE_CATALOG, expandGroups, PLAN_DEFAULT_GROUPS } from '@/lib/tenant/moduleCatalog';
import { usePlan } from './hooks/usePlan';

interface CrmSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** When true, the sidebar is fully hidden on desktop too (not just mobile) and
   *  only shown as a temporary overlay while `isOpen` — used by pages like the
   *  QR WhatsApp inbox that need the full width while a chat is open. */
  hiddenOnDesktop?: boolean;
}

// Sections only super-admins should see.
const SUPER_ADMIN_KEYS = new Set(['super-admin', 'tenants', 'tenants-plan', 'web-admin', 'archive', 'bank-income', 'leads-hub', 'social-hub']);

// Main domain (swaryoga.com) displays the 16 clean, organized functional sections:
const MAIN_DOMAIN_SECTION_KEYS = [
  'web-admin',           // 1. Website Management (Card Grid Hub)
  'workshop-management', // 2. Workshop Management (Includes Landing Pages)
  'leads-hub',           // 3. Leads Management (Card Grid Hub - Unified Web, Meta, QR, Forms)
  'sales',               // 4. Sales Management
  'bank-income',         // 5. Banking & Finance
  'zoom',                // 6. Zoom Management (Isolated from workshops)
  'communication',       // 7. Communication (Card Grid Hub - QR WA, Meta, Email, Calls, SMS, Telegram)
  'community',           // 8. Community (Kept as it is)
  'planner',             // 9. Planner (Kept as it is)
  'automation',          // 10. Automation & AI
  'broadcast',           // 11. Broadcast (Kept as it is)
  'social-hub',          // 12. Social Media (Card Grid Hub)
  'tenants',             // 13. CRM & Tenants
  'reports',             // 14. All Reports
  'settings',            // 15. Settings
  'kp-astro',            // 16. KP Astro
  'elearning',           // 17. E-Learning (Strictly untouched!)
];

// Tenant CRM (crm.swaryoga.com) shows ONLY these module sections, in this order.
// Owner-panel sections (web-admin / super-admin / tenants / archive) never appear here —
// that work lives on the main domain (swaryoga.com/admin/crm/super-admin).
const TENANT_SECTION_KEYS = [
  'dashboard',
  'qr-leads', 'qr',
  'sales', 'meta',
  'email', 'messages', 'telegram',
  'elearning',
  'sadhana', 'sadhana-schedule',
  'community', 'zoom', 'workshop-management',
  'planner',
  'reports',
  'automation', 'chatbot',
  'landing-pages',
  'settings', 'storage',
];

// True when running on the tenant CRM subdomain (crm.swaryoga.com / crm.localhost).
function detectCrmDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return /^crm\./i.test(window.location.hostname);
}


// Landing route for a module = its first sub-page (header tab), else its prefix.
function landingHref(s: SectionConfig): string {
  return s.items[0]?.href || s.moreItems?.[0]?.href || s.prefixes[0] || '/admin/crm';
}

/**
 * Flat, one-entry-per-module CRM sidebar. Each entry opens the module's landing
 * page; that module's sub-pages then appear as tabs in the CrmSubNav header.
 * Driven by the same `sectionConfigs` as the header, so the two never drift.
 */
export default function CrmSidebar({ isOpen, onClose, collapsed = false, onToggleCollapse, hiddenOnDesktop = false }: CrmSidebarProps) {
  const pathname = usePathname() || '';
  const router = useRouter();

  const isSuper = typeof window !== 'undefined' ? checkIsSuperAdmin() : false;
  const activeKey = findSectionForPath(pathname)?.key;
  usePlan(); // keep provider alive for other components

  // Tenant module keys. null = still loading, Set = loaded (may be empty).
  const [tenantModuleKeys, setTenantModuleKeys] = useState<Set<string> | null>(null);
  // Trial / subscription state for the days-left badge.
  const [trial, setTrial] = useState<{ isTrialActive?: boolean; trialDaysRemaining?: number; isLocked?: boolean; status?: string } | null>(null);

  useEffect(() => {
    async function loadTenantModules() {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
        : null;

      // Helper: build a Set from raw key list + always add settings
      const buildSet = (keys: string[]) => {
        const groupKeys = keys.filter((k) => typeof k === 'string' && !k.includes('.'));
        const childKeys = keys.filter((k) => typeof k === 'string' && k.includes('.'));
        const s = new Set<string>([...expandGroups(groupKeys), ...childKeys]);
        s.add('settings');
        return s;
      };

      // Prefetch the plans list ONCE, in parallel with the other requests, so
      // resolving the plan → bundles doesn't add an extra sequential round-trip.
      const plansPromise = fetch('/api/admin/tenants/plans')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // Helper: resolve a plan tier → its default bundle groups.
      // Prefers DB-configured plans, falls back to the in-code PLAN_DEFAULT_GROUPS.
      const keysFromPlan = async (tier: string): Promise<string[]> => {
        // Unknown/empty tier → 'free', so we still read the EDITED free plan
        // from the DB (which includes any pages added in Tenants Plan).
        const t = (tier || '').toString().toLowerCase().trim() || 'free';
        const d = await plansPromise;
        const p = (d?.data?.plans || []).find((x: any) => x.tier === t);
        if (p?.defaultGroups?.length) return p.defaultGroups;
        return PLAN_DEFAULT_GROUPS[t] || PLAN_DEFAULT_GROUPS.free || [];
      };

      // Helper: fetch plan tier from setup-status (fallback when no tenantSlug)
      const tierFromSetupStatus = async (): Promise<string> => {
        try {
          const r = await fetch('/api/crm-site/setup-status', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!r.ok) return '';
          const d = await r.json();
          return d?.planId || '';
        } catch { return ''; }
      };

      if (!token) {
        setTenantModuleKeys(buildSet([])); // show settings only
        return;
      }

      try {
        // The sidebar shows the UNION of (a) the tenant's plan's current
        // bundles and (b) any extra modules assigned to this specific tenant.
        // So editing a plan's pages in Tenants Plan propagates to every tenant
        // on that plan, while per-tenant extras still show.
        const r = await fetch('/api/crm-site/my-modules', { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const j = await r.json();
          const d = j?.data || {};
          if (d.trial) setTrial(d.trial);
          const tenantKeys: string[] = Array.isArray(d.moduleKeys) ? d.moduleKeys : [];
          const planKeys = await keysFromPlan(d.plan || await tierFromSetupStatus());
          setTenantModuleKeys(buildSet([...planKeys, ...tenantKeys]));
          return;
        }

        // Endpoint unavailable → fall back to the plan's default pages.
        setTenantModuleKeys(buildSet(await keysFromPlan(await tierFromSetupStatus())));
      } catch {
        // Complete failure — fail open to the plan's pages so sidebar isn't empty
        setTenantModuleKeys(buildSet(await keysFromPlan(await tierFromSetupStatus())));
      }
    }

    loadTenantModules();
  }, []);

  // Complete section → required bundle mapping.
  // A section is shown only if the tenant has at least one of the listed bundle keys.
  // Sections NOT listed here (dashboard) are always shown.
  const SECTION_TO_MODULE_KEYS: Record<string, string[]> = {
    // Sales & Funnel — only for Copper+ (whatsapp_meta needed for Meta leads pipeline)
    'sales':          ['whatsapp_meta'],
    // QR Leads Management — all plans with lead_management
    'qr-leads':       ['lead_management'],
    'reports':        ['lead_management', 'report'],
    // QR WhatsApp — always visible for every tenant (no plan gating),
    // like Dashboard/Storage. (Intentionally not mapped to a bundle.)
    // Broadcast WhatsApp — only for Copper+ (Meta broadcasts; QR broadcasts are inside QR WA section)
    'broadcast':      ['whatsapp_meta'],
    // Communication Hub — Omnichannel suite
    'communication':  ['whatsapp_meta', 'email', 'sms', 'ai_calling', 'telegram'],
    // Meta WhatsApp — whatsapp_meta bundle (Copper+)
    'meta':           ['whatsapp_meta'],
    // Email — email bundle
    'email':          ['email'],
    // Community — community bundle
    'community':      ['community'],
    'zoom':           ['community'],
    // AI / Chatbot / Automation — chatbot bundle
    'chatbot':        ['chatbot'],
    'automation':     ['chatbot'],
    // Sadhana — sadhana_program bundle (Golden+)
    'sadhana':        ['sadhana_program', 'sadhana_schedule'],
    'sadhana-schedule': ['sadhana_schedule', 'sadhana_program'],
    // Telegram — telegram bundle
    'telegram':       ['telegram'],
    // SMS — sms bundle
    'messages':       ['sms'],
    // Calls — ai_calling bundle
    'calls':          ['ai_calling'],
    // Planner — planner bundle
    'planner':        ['planner'],
    // Landing Pages — landing_page bundle (Silver+)
    'landing-pages':  ['landing_page'],
    // E-Learning — elearning bundle (Silver+)
    'elearning':      ['elearning'],
    // Settings — only Copper+ (whatsapp_meta); Besic uses profile dropdown for settings
    'settings':       ['whatsapp_meta'],
    // Connections — needs at least one channel API (Copper+)
    'connections':    ['whatsapp_meta', 'email', 'telegram', 'tally'],
    // Integrations — advanced features (Silver+)
    'integration-hub':['chatbot', 'elearning', 'community'],
    // Extensions/Addons — premium bundles
    'addons':         ['elearning', 'sadhana_program', 'tally', 'ai_calling'],
  };

  const isCrmDomain = detectCrmDomain();

  // Does the tenant's plan include the module section? (Dashboard / unmapped = always.)
  const hasModule = (key: string): boolean => {
    if (key === 'dashboard') return true;
    const required = SECTION_TO_MODULE_KEYS[key];
    if (!required) return true; // no mapping = always show
    if (tenantModuleKeys !== null) {
      // Tenant's actual module keys are the single source of truth
      return required.some((rk) =>
        tenantModuleKeys.has(rk) ||
        Array.from(tenantModuleKeys).some((k) => k.startsWith(rk + '.'))
      );
    }
    // Still loading (null) — HIDE gated sections so we don't flash every page
    // and then collapse. Only the always-on sections (no mapping) show meanwhile.
    return false;
  };

  const modules = useMemo(() => {
    // Tenant CRM domain (crm.swaryoga.com): only the curated tenant modules, in order.
    // Super-admin here sees every tenant module; tenants are gated by their plan.
    if (isCrmDomain) {
      const ordered = TENANT_SECTION_KEYS
        .map((k) => sectionConfigs.find((s) => s.key === k))
        .filter((s): s is SectionConfig => Boolean(s));
      return isSuper ? ordered : ordered.filter((s) => hasModule(s.key));
    }

    // Main domain (swaryoga.com): the 16 clean organized sections
    const ordered = MAIN_DOMAIN_SECTION_KEYS
      .map((k) => sectionConfigs.find((s) => s.key === k))
      .filter((s): s is SectionConfig => Boolean(s));
    return isSuper ? ordered : ordered.filter((s) => {
      if (SUPER_ADMIN_KEYS.has(s.key)) return false;
      return hasModule(s.key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper, isCrmDomain, tenantModuleKeys]);

  const width = collapsed ? 'w-[68px]' : 'w-60';

  return (
    <>
      {/* Mobile overlay (also shown on desktop when the sidebar is force-hidden there) */}
      {isOpen && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${hiddenOnDesktop ? '' : 'md:hidden'}`}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed ${hiddenOnDesktop ? '' : 'md:static'} inset-y-0 left-0 z-[10000] ${width} bg-[#0b0f19] border-r border-slate-800/80 text-white transform transition-all duration-300 ease-in-out flex flex-col relative overflow-hidden ${
          isOpen ? 'translate-x-0' : (hiddenOnDesktop ? '-translate-x-full' : '-translate-x-full md:translate-x-0')
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className={`border-b border-slate-800/80 flex-shrink-0 relative z-10 ${collapsed ? 'p-2.5' : 'p-3.5'}`}>
          <div className="flex items-center justify-between mb-2.5">
            {!collapsed && (
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/25 flex-shrink-0 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img
                      src="https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png"
                      alt="Swar Yoga"
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm truncate text-white tracking-tight">Swar Yoga</h2>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 truncate">CRM Suite</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="flex items-center justify-center w-full">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/25 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img
                      src="https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png"
                      alt="Swar Yoga"
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <button onClick={onClose} className={`${hiddenOnDesktop ? '' : 'md:hidden'} p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition`}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {!collapsed && (
            <button
              onClick={() => { router.push('/'); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/25 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>
          )}
        </div>

        {/* Module list */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1">
          {modules.map((s) => {
            const Icon = s.icon;
            const active = activeKey === s.key;
            return (
              <Link
                key={s.key}
                href={landingHref(s)}
                onClick={onClose}
                title={collapsed ? s.title : undefined}
                className={`flex items-center gap-2.5 rounded-xl transition-all duration-150 group relative ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                } ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-300 font-bold border-l-[3px] border-emerald-400 shadow-sm shadow-emerald-950/30'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 transition-all ${
                      active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'text-slate-500 group-hover:text-slate-200 group-hover:scale-105'
                    }`}
                  />
                )}
                {!collapsed && <span className="text-xs truncate">{s.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Trial / subscription status (non-super-admin only) */}
        {!isSuper && (
          <div className={`border-t border-slate-800/80 flex-shrink-0 relative z-10 ${collapsed ? 'p-2' : 'p-3'} space-y-2`}>
            {/* Trial days-left / expired badge */}
            {trial?.isTrialActive && !collapsed && (
              <Link href="/admin/crm/subscription" onClick={onClose} className="block rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 hover:bg-emerald-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-emerald-300">Free Trial Active</div>
                    <div className="text-[10px] text-emerald-200/80">{trial.trialDaysRemaining} day{trial.trialDaysRemaining === 1 ? '' : 's'} remaining</div>
                  </div>
                </div>
              </Link>
            )}
            {trial?.isTrialActive && collapsed && (
              <Link href="/admin/crm/subscription" onClick={onClose} title={`Trial: ${trial.trialDaysRemaining} days left`} className="flex items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2 py-2 text-emerald-300 text-xs font-bold shadow-xs">
                {trial.trialDaysRemaining}d
              </Link>
            )}
            {trial?.isLocked && !collapsed && (
              <Link href="/admin/crm/subscription" onClick={onClose} className="block rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 hover:bg-rose-500/25 transition">
                <div className="text-xs font-bold text-rose-300">Trial Ended</div>
                <div className="text-[10px] text-rose-200/80">Subscribe to continue</div>
              </Link>
            )}

            <Link
              href="/admin/crm/subscription"
              onClick={onClose}
              title={collapsed ? 'Upgrade Plan' : undefined}
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white transition-all font-semibold shadow-md shadow-orange-500/20 active:scale-[0.98] ${
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
              }`}
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs tracking-wide">Upgrade Plan</span>}
            </Link>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        {onToggleCollapse && (
          <div className="border-t border-slate-800/80 p-2 hidden md:block flex-shrink-0 relative z-10">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white text-xs transition"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-[11px] font-medium">Collapse Sidebar</span></>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
