'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import CrmSubNav from './CrmSubNav';
import { findSectionForPath } from './crmNavConfig';

/**
 * CrmShell wraps all CRM pages with:
 * 1. Collapsible AdminSidebar on the left
 * 2. CrmSubNav header bar (auto-detected from pathname)
 * 3. Main content area
 *
 * This is rendered once in layout.tsx — individual pages
 * should NOT import AdminSidebar or CrmSubNav themselves.
 */
export default function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Auto-detect current section from pathname
  const section = findSectionForPath(pathname || '');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
