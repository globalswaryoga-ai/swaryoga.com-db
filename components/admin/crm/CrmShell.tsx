'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import CrmSubNav from './CrmSubNav';
import { findSectionForPath } from './crmNavConfig';
import TenantOnboarding from './TenantOnboarding';
import StoragePurchaseModal from './StoragePurchaseModal';
import { useOnboarding } from './hooks/useOnboarding';

/**
 * CrmShell wraps all CRM pages with:
 * 1. Collapsible AdminSidebar on the left
 * 2. CrmSubNav header bar (auto-detected from pathname)
 * 3. Main content area
 * 4. Tenant Onboarding flow for new users
 *
 * This is rendered once in layout.tsx — individual pages
 * should NOT import AdminSidebar or CrmSubNav themselves.
 */
export default function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const {
    status,
    loading,
    showOnboarding,
    setShowOnboarding,
    showStorageModal,
    setShowStorageModal,
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

  const handleStoragePurchase = () => {
    setShowOnboarding(false);
    setShowStorageModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowStorageModal(false);
    refreshStatus();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Tenant Onboarding Modal */}
      {showOnboarding && !loading && (
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

        {/* Page content - scrollable */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
