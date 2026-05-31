'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { sectionConfigs, findSectionForPath, type SectionConfig } from './crmNavConfig';
import { MODULE_CATALOG, expandGroups } from '@/lib/tenant/moduleCatalog';
import { usePlan } from './hooks/usePlan';

interface CrmSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Sections only super-admins should see.
const SUPER_ADMIN_KEYS = new Set(['super-admin', 'tenants', 'web-admin']);


// Landing route for a module = its first sub-page (header tab), else its prefix.
function landingHref(s: SectionConfig): string {
  return s.items[0]?.href || s.moreItems?.[0]?.href || s.prefixes[0] || '/admin/crm';
}

/**
 * Flat, one-entry-per-module CRM sidebar. Each entry opens the module's landing
 * page; that module's sub-pages then appear as tabs in the CrmSubNav header.
 * Driven by the same `sectionConfigs` as the header, so the two never drift.
 */
export default function CrmSidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }: CrmSidebarProps) {
  const pathname = usePathname() || '';
  const router = useRouter();

  const isSuper = typeof window !== 'undefined' ? checkIsSuperAdmin() : false;
  const activeKey = findSectionForPath(pathname)?.key;
  usePlan(); // keep provider alive for other components

  // Tenant module keys. null = still loading, Set = loaded (may be empty).
  const [tenantModuleKeys, setTenantModuleKeys] = useState<Set<string> | null>(null);

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

      // Helper: fetch plan defaultGroups by tier slug
      const keysFromPlan = async (tier: string): Promise<string[]> => {
        try {
          const r = await fetch('/api/admin/tenants/plans');
          if (!r.ok) return [];
          const d = await r.json();
          const p = (d?.data?.plans || []).find((x: any) => x.tier === tier);
          return p?.defaultGroups || [];
        } catch { return []; }
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
        // Step 1: get account profile
        const accRes = await fetch('/api/crm-site/account', { headers: { Authorization: `Bearer ${token}` } });
        if (!accRes.ok) {
          // No account → fall back via setup-status
          const tier = await tierFromSetupStatus();
          const keys = tier ? await keysFromPlan(tier) : [];
          setTenantModuleKeys(buildSet(keys));
          return;
        }
        const acc = await accRes.json();
        const tenantSlug = acc?.profile?.tenantSlug;

        if (!tenantSlug) {
          // Logged-in user has no tenant slug → use plan from setup-status
          const tier = await tierFromSetupStatus();
          const keys = tier ? await keysFromPlan(tier) : [];
          setTenantModuleKeys(buildSet(keys));
          return;
        }

        // Step 2: get tenant record
        const tRes = await fetch(`/api/tenants/${encodeURIComponent(tenantSlug)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!tRes.ok) {
          const tier = await tierFromSetupStatus();
          const keys = tier ? await keysFromPlan(tier) : [];
          setTenantModuleKeys(buildSet(keys));
          return;
        }
        const tjson = await tRes.json();
        let keys: string[] = tjson?.tenant?.moduleKeys || tjson?.tenant?.enabledModules || [];

        // If moduleKeys empty, derive from plan's defaultGroups
        if (keys.length === 0) {
          const tier = tjson?.tenant?.plan || await tierFromSetupStatus();
          if (tier) keys = await keysFromPlan(tier);
        }

        setTenantModuleKeys(buildSet(keys));
      } catch {
        // Complete failure — fail open with minimal set so sidebar isn't empty
        const tier = await tierFromSetupStatus();
        const keys = tier ? await keysFromPlan(tier) : [];
        setTenantModuleKeys(buildSet(keys));
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
    // QR WhatsApp — whatsapp_qr bundle
    'qr':             ['whatsapp_qr'],
    // Broadcast WhatsApp — only for Copper+ (Meta broadcasts; QR broadcasts are inside QR WA section)
    'broadcast':      ['whatsapp_meta'],
    // Meta WhatsApp — whatsapp_meta bundle (Copper+)
    'meta':           ['whatsapp_meta'],
    // Email — email bundle
    'email':          ['email'],
    // Community — community bundle
    'community':      ['community'],
    // AI / Chatbot / Automation — chatbot bundle
    'chatbot':        ['chatbot'],
    'automation':     ['chatbot'],
    // Sadhana — sadhana_program bundle (Golden+)
    'sadhana':        ['sadhana_program', 'sadhana_schedule'],
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

  const modules = useMemo(() => {
    return sectionConfigs.filter((s) => {
      // Super-admin-only sections: hide from regular users
      if (SUPER_ADMIN_KEYS.has(s.key) && !isSuper) return false;
      // Super-admin sees ALL sections — no module key gating
      if (isSuper) return true;
      // Dashboard always visible
      if (s.key === 'dashboard') return true;

      const required = SECTION_TO_MODULE_KEYS[s.key];
      if (!required) return true; // no mapping = always show

      if (tenantModuleKeys !== null) {
        // Tenant's actual module keys are the single source of truth
        return required.some((rk) =>
          tenantModuleKeys.has(rk) ||
          Array.from(tenantModuleKeys).some((k) => k.startsWith(rk + '.'))
        );
      }
      // Still loading (null) — show section so sidebar isn't blank while fetching
      return true;
    });
  }, [isSuper, tenantModuleKeys]);

  const width = collapsed ? 'w-[68px]' : 'w-60';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" onClick={onClose} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-[10000] ${width} bg-gray-900 text-white transform transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className={`border-b border-gray-800 flex-shrink-0 ${collapsed ? 'p-2' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'space-x-2.5 min-w-0 flex-1'}`}>
              <img src="/logo.png" alt="Swar Yoga" className="w-8 h-8 rounded-lg flex-shrink-0" />
              {!collapsed && <h2 className="font-bold text-base truncate text-white">Swar Yoga</h2>}
            </div>
            <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-gray-800 transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!collapsed && (
            <button
              onClick={() => { router.push('/'); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-swar-primary hover:bg-swar-primary-dark rounded-lg text-white text-xs font-medium transition"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>
          )}
        </div>

        {/* Module list */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {modules.map((s) => {
            const Icon = s.icon;
            const active = activeKey === s.key;
            return (
              <Link
                key={s.key}
                href={landingHref(s)}
                onClick={onClose}
                title={collapsed ? s.title : undefined}
                className={`flex items-center gap-3 rounded-lg transition-colors ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-emerald-400' : ''}`} />}
                {!collapsed && <span className="text-sm truncate">{s.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Plan banner (non-super-admin only) */}
        {!isSuper && (
          <div className={`border-t border-gray-800 flex-shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
            <Link
              href="/admin/crm/subscription"
              onClick={onClose}
              title={collapsed ? 'Upgrade Plan' : undefined}
              className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white transition font-medium ${
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
              }`}
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs">Upgrade Plan</span>}
            </Link>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        {onToggleCollapse && (
          <div className="border-t border-gray-800 p-2 hidden md:block flex-shrink-0">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white text-xs transition"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
