'use client';

import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { usePathname } from 'next/navigation';
import CrmSidebar from './CrmSidebar';
import CrmSubNav from './CrmSubNav';
import { findSectionForPath } from './crmNavConfig';
import TenantOnboarding from './TenantOnboarding';
import StoragePurchaseModal from './StoragePurchaseModal';
import CompartmentSetupModal from './CompartmentSetupModal';
import CompartmentGuard from './CompartmentGuard';
import TrialPaywall from './TrialPaywall';
import { PlanProvider, usePlan } from './hooks/usePlan';
import { TrialBanner, PlanGate } from './PlanComponents';
import { PATH_TO_MODULE, CrmModule } from '@/lib/crm-site/planConfig';
import { useOnboarding } from './hooks/useOnboarding';
import { ToastProvider } from './ui/Toast';
import { checkIsSuperAdmin } from '@/lib/client-auth';

interface CrmSidebarControl {
  /** True while a page has asked to hide the persistent sidebar on desktop too. */
  hiddenOnDesktop: boolean;
  setHiddenOnDesktop: (hidden: boolean) => void;
}

const CrmSidebarControlContext = createContext<CrmSidebarControl | null>(null);

/**
 * Lets a CRM page (e.g. the QR WhatsApp inbox while a chat is open) hide the
 * persistent left sidebar to reclaim width. A small menu button appears in
 * the header instead — clicking it previews the sidebar as an overlay.
 * Automatically restores the sidebar when `hide` goes back to false or the
 * calling page unmounts.
 */
export function useCrmSidebarAutoHide(hide: boolean) {
  const ctx = useContext(CrmSidebarControlContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setHiddenOnDesktop(hide);
    return () => ctx.setHiddenOnDesktop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hide, ctx]);
}

/**
 * CrmShell wraps all CRM pages with:
 * 1. Collapsible AdminSidebar on the left
 * 2. CrmSubNav header bar (auto-detected from pathname)
 * 3. Main content area
 * 4. Tenant Onboarding flow for new users
 * 5. PlanProvider for plan-gated features
 * 6. TrialBanner when trial is active
 *
 * This is rendered once in layout.tsx — individual pages
 * should NOT import AdminSidebar or CrmSubNav themselves.
 */
export default function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hiddenOnDesktop, setHiddenOnDesktop] = useState(false);
  const sidebarControl = useMemo<CrmSidebarControl>(
    () => ({ hiddenOnDesktop, setHiddenOnDesktop }),
    [hiddenOnDesktop]
  );
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentPlan, setCurrentPlan] = useState<string>('');

  const {
    status,
    loading,
    showOnboarding,
    setShowOnboarding,
    showStorageModal,
    setShowStorageModal,
    showCompartmentSetup,
    setShowCompartmentSetup,
    completeOnboarding,
    refreshStatus,
  } = useOnboarding();

  // Get user info from localStorage
  useEffect(() => {
    const name = localStorage.getItem('crm_user_name') || '';
    const email = localStorage.getItem('crm_user_email') || '';
    setUserName(name);
    setUserEmail(email);
  }, []);

  // Get current plan from subscription API
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('crm_token') || localStorage.getItem('adminToken');
        if (!token) return;

        const res = await fetch('/api/admin/crm/subscription', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.subscription?.currentPlan) {
          setCurrentPlan(data.subscription.currentPlan);
        }
      } catch (err) {
        console.log('Plan fetch failed, defaulting to show header');
      }
    };
    fetchPlan();
  }, []);

  // Auto-detect current section from pathname
  const section = findSectionForPath(pathname || '');

  // Auto-detect gated module from current path
  const currentModule: CrmModule | null = (() => {
    const p = pathname || '';
    // Exact match first
    if (PATH_TO_MODULE[p]) return PATH_TO_MODULE[p];
    // Prefix match (e.g. /admin/crm/broadcast/reports → broadcasting)
    const match = Object.keys(PATH_TO_MODULE)
      .filter(k => p.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    return match ? PATH_TO_MODULE[match] : null;
  })();

  // Super-admin (owner) never sees onboarding/storage/compartment popups.
  const isSuper = typeof window !== 'undefined' ? checkIsSuperAdmin() : false;

  const handleStoragePurchase = () => {
    setShowOnboarding(false);
    setShowStorageModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowStorageModal(false);
    // After payment, re-open compartment setup for remaining steps (Bunny, MongoDB, verify)
    setShowCompartmentSetup(true);
    refreshStatus();
  };

  return (
    <CrmSidebarControlContext.Provider value={sidebarControl}>
    <PlanProvider>
    <ToastProvider>
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Compartment Setup Modal (blocks everything until setup complete) */}
      {showCompartmentSetup && !loading && !isSuper && (
        <CompartmentSetupModal
          isOpen={showCompartmentSetup}
          onClose={() => setShowCompartmentSetup(false)}
          onComplete={() => {
            setShowCompartmentSetup(false);
            refreshStatus();
          }}
          onStoragePurchase={() => {
            setShowCompartmentSetup(false);
            setShowStorageModal(true);
          }}
        />
      )}

      {/* Tenant Onboarding Modal */}
      {showOnboarding && !loading && !showCompartmentSetup && !isSuper && (
        <TenantOnboarding
          userName={userName}
          userEmail={userEmail}
          onComplete={completeOnboarding}
          onStoragePurchase={handleStoragePurchase}
        />
      )}

      {/* Storage Purchase Modal */}
      {showStorageModal && !isSuper && (
        <StoragePurchaseModal
          isOpen={showStorageModal}
          onClose={() => setShowStorageModal(false)}
          currentPlan={status?.planId}
          currentStorageMB={status?.storageUsedMB}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Sidebar — flat module list (sub-pages live in the CrmSubNav header) */}
      <CrmSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        hiddenOnDesktop={hiddenOnDesktop}
      />

      {/* Read-only paywall when the free trial has ended (unpaid) */}
      <TrialPaywall />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial Banner */}
        <TrialBanner />

        {/* Section Sub-Nav Header - always show sub-nav for CRM pages */}
        {section && (
          <CrmSubNav
            title={section.title}
            icon={section.icon}
            items={section.items}
            moreItems={section.moreItems}
            onMenuClick={() => setSidebarOpen(true)}
            showMenuButtonOnDesktop={hiddenOnDesktop}
          />
        )}

        {/* Page content - scrollable, guarded by compartment + plan */}
        <main className="flex-1 overflow-y-auto">
          {/* Global loading skeleton while onboarding status is being resolved */}
          {loading ? (
            <div className="p-6 space-y-6 animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                      <div className="w-5 h-5 bg-gray-100 rounded" />
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-28 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm h-64" />
            </div>
          ) : (
          <div className="animate-fade-in">
          {currentModule ? (
            <PlanGate module={currentModule} variant="page">
              {children}
            </PlanGate>
          ) : (
            children
          )}
          </div>
          )}
        </main>
      </div>
    </div>
    </ToastProvider>
    </PlanProvider>
    </CrmSidebarControlContext.Provider>
  );
}