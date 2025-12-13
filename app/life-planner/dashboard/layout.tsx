'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import LifePlannerSidebar from '@/components/LifePlannerSidebar';
import LifePlannerTopNav from '@/components/LifePlannerTopNav';

export default function LifePlannerDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('lifePlannerUser');
    const token = localStorage.getItem('lifePlannerToken');
    if (!session) {
      router.push('/life-planner/login');
      return;
    }
    if (!token) {
      // Token is required for Mongo-backed persistence; without it the API returns 401.
      router.push('/life-planner/login');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white">
      <LifePlannerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <LifePlannerTopNav sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-6 bg-white">{children}</main>
      </div>
    </div>
  );
}
