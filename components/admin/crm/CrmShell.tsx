'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import CrmSubNav from './CrmSubNav';
import { findSectionForPath } from './crmNavConfig';
import TenantOnboarding from './TenantOnboarding';
import StoragePurchaseModal from './StoragePurchaseModal';
import CompartmentSetupModal from './CompartmentSetupModal';
import CompartmentGuard from './CompartmentGuard';
import { PlanProvider } from './hooks/usePlan';
import { TrialBanner, PlanGate } from './PlanComponents';
import { PATH_TO_MODULE, CrmModule } from '@/lib/crm-site/planConfig';
import { useOnboarding } from './hooks/useOnboarding';
import BackupReminder from './BackupReminder';
import PageGuide from './PageGuide';
import PAGE_GUIDES from './pageGuideData';

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
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

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

  // Get page guide for current page
  const pageGuideKey = (() => {
    const p = pathname || '';
    const suffix = p.replace('/admin/crm/', '').replace(/\/$/, '');
    // Exact match
    if (PAGE_GUIDES[suffix]) return suffix;
    // First segment match (e.g. /admin/crm/broadcast/reports → broadcast)
    const firstSeg = suffix.split('/')[0];
    if (firstSeg && PAGE_GUIDES[firstSeg]) return firstSeg;
    return null;
  })();
  const pageGuide = pageGuideKey ? PAGE_GUIDES[pageGuideKey] : null;

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
    <PlanProvider>
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Compartment Setup Modal (blocks everything until setup complete) */}
      {showCompartmentSetup && !loading && (
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
      {showOnboarding && !loading && !showCompartmentSetup && (
        <TenantOnboarding
          userName={userName}
          userEmail={userEmail}
          onComplete={completeOnboarding}
          onStoragePurchase={handleStoragePurchase}
        />
      )}

      {/* Storage Purchase Modal */}
      {showStorageModal && (
        <StoragePurchaseModal
          isOpen={showStorageModal}
          onClose={() => setShowStorageModal(false)}
          currentPlan={status?.planId}
          currentStorageMB={status?.storageUsedMB}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial Banner */}
        <TrialBanner />

        {/* Section Sub-Nav Header */}
        {section && (
          <CrmSubNav
            title={section.title}
            icon={section.icon}
            items={section.items}
            moreItems={section.moreItems}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {/* Page content - scrollable, guarded by compartment + plan */}
        <main className="flex-1 overflow-y-auto">
          {/* Page Guide — auto-detected from pathname */}
          {pageGuide && <PageGuide guide={pageGuide} />}

          {(!loading && status && !status.isSuperAdmin && !status.compartmentReady) ? (
            <CompartmentGuard
              pageName={section?.title || 'CRM'}
              onStoragePurchase={handleStoragePurchase}
            >
              {currentModule ? (
                <PlanGate module={currentModule} variant="page">
                  {children}
                </PlanGate>
              ) : children}
            </CompartmentGuard>
          ) : currentModule ? (
            <PlanGate module={currentModule} variant="page">
              {children}
            </PlanGate>
          ) : (
            children
          )}
        </main>
      </div>
    </div>

    {/* 7-day backup reminder popup */}
    <BackupReminder />
    </PlanProvider>
  );
}