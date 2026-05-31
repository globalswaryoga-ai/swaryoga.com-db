'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { sectionConfigs, findSectionForPath, type SectionConfig } from './crmNavConfig';
import { MODULE_CATALOG, expandGroups } from '@/lib/tenant/moduleCatalog';
import { usePlan } from './hooks/usePlan';
import type { CrmModule } from '@/lib/crm-site/planConfig';

interface CrmSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Sections only super-admins should see.
const SUPER_ADMIN_KEYS = new Set(['super-admin', 'tenants', 'web-admin']);

// Which plan module each module-section needs. Sections NOT listed here are
// always shown (Dashboard, Settings, Connections, Tools, etc.). A section is
// hidden when the tenant's plan does not grant its module.
const SECTION_MODULE: Record<string, CrmModule> = {
  sales: 'leads',
  meta: 'whatsapp',
  qr: 'whatsapp',
  broadcast: 'broadcasting',
  telegram: 'whatsapp',
  email: 'emailMarketing',
  messages: 'broadcasting',
  community: 'community',
  chatbot: 'chatbot',
  automation: 'automation',
  calls: 'aiCalls',
  reports: 'reports',
};

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
  const { canAccess } = usePlan();
  const { plan } = usePlan();

  // Tenant-enabled module keys (expanded to include child keys).
  const [tenantModuleKeys, setTenantModuleKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    // Fetch current account -> tenant slug -> tenant details (enabledModules/moduleKeys)
    async function loadTenantModules() {
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token')) : null;
        if (!token) return setTenantModuleKeys(null);

        const accRes = await fetch('/api/crm-site/account', { headers: { Authorization: `Bearer ${token}` } });
        if (!accRes.ok) return setTenantModuleKeys(null);
        const acc = await accRes.json();
        const tenantSlug = acc?.profile?.tenantSlug;
        if (!tenantSlug) return setTenantModuleKeys(null);

        const tRes = await fetch(`/api/tenants/${encodeURIComponent(tenantSlug)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!tRes.ok) return setTenantModuleKeys(null);
        const tjson = await tRes.json();
        const keys: string[] = tjson?.tenant?.enabledModules || tjson?.tenant?.moduleKeys || [];

        // Partition into groups (no dot) and child keys (contain dot). Expand group keys.
        const groupKeys = keys.filter((k) => typeof k === 'string' && !k.includes('.'));
        const childKeys = keys.filter((k) => typeof k === 'string' && k.includes('.'));

        const expanded = new Set<string>([...expandGroups(groupKeys), ...childKeys]);

        // Ensure only valid catalog keys are kept (defensive)
        const valid = new Set<string>(MODULE_CATALOG.flatMap((g) => [g.key, ...g.children.map((c) => c.key)]));
        for (const k of Array.from(expanded)) if (!valid.has(k)) expanded.delete(k);

        setTenantModuleKeys(expanded);
      } catch (e) {
        setTenantModuleKeys(null);
      }
    }

    loadTenantModules();
  }, []);

  // For Basic plan tenants we show a limited set of primary sections only.
  const BASIC_WHITELIST = new Set(['qr-leads', 'qr', 'planner', 'reports', 'settings', 'dashboard', 'connections']);

  // Map section keys to module-catalog group keys they depend on.
  const SECTION_TO_MODULE_KEYS: Record<string, string[]> = {
    'qr': ['whatsapp_qr'],
    'qr-leads': ['lead_management'],
    'sales': ['lead_management'],
    'planner': ['planner'],
    'reports': ['report', 'lead_management'],
    'broadcast': ['whatsapp_qr', 'whatsapp_meta'],
    'email': ['email'],
    'community': ['community'],
    'chatbot': ['chatbot'],
    'telegram': ['telegram'],
    'settings': ['settings'],
    'messages': ['sms'],
    'calls': ['ai_calling'],
    'automation': ['chatbot'],
  };

  const modules = useMemo(() => {
    return sectionConfigs.filter((s) => {
      // Super-admin-only sections.
      if (SUPER_ADMIN_KEYS.has(s.key) && !isSuper) return false;

      // If we successfully loaded tenant module keys, use them as the source
      // of truth: only show sections that map to enabled catalog keys.
      const required = SECTION_TO_MODULE_KEYS[s.key];
      if (tenantModuleKeys) {
        if (required && !required.some((rk) => tenantModuleKeys.has(rk) || Array.from(tenantModuleKeys).some((k) => k.startsWith(rk + '.')))) {
          return false;
        }
      } else {
        // Fallback: If tenant modules not yet loaded, keep previous Basic whitelist behaviour.
        if (plan === 'basic' && !BASIC_WHITELIST.has(s.key)) return false;
      }

      // Plan gating: hide a module the tenant's plan doesn't include.
      const mod = SECTION_MODULE[s.key];
      if (mod && !canAccess(mod)) return false;
      return true;
    });
  }, [isSuper, canAccess, plan, tenantModuleKeys]);

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
