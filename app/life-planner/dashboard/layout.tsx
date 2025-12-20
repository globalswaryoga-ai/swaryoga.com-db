'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import LifePlannerSidebar from '@/components/LifePlannerSidebar';
import LifePlannerTopNav from '@/components/LifePlannerTopNav';
import { ensureSessionExpiry, extendSession } from '@/lib/sessionManager';

export default function LifePlannerDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default closed on small screens to avoid covering content and causing accidental navigation.
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Life Planner historically used its own keys, but the rest of the app uses the unified session manager
    // (token/user). Support both so the dashboard reliably opens.
    const plannerSessionRaw = localStorage.getItem('lifePlannerUser');
    const plannerToken = localStorage.getItem('lifePlannerToken');

    const appToken = localStorage.getItem('token');
    const appUserRaw = localStorage.getItem('user');

    const effectiveToken = plannerToken || appToken;

    // Mirror sessions BOTH ways so website-profile and life-planner profile are always the same.
    // 1) App -> Life Planner (existing behavior)

    // If user has a normal app session, mirror it into Life Planner keys for backward compatibility.
    // This allows existing life-planner storage code (which reads lifePlannerToken/lifePlannerUser) to work.
    if (!plannerToken && appToken) {
      localStorage.setItem('lifePlannerToken', appToken);
    }

    if (!plannerSessionRaw && appUserRaw) {
      try {
        const appUser = JSON.parse(appUserRaw);
        const email = typeof appUser?.email === 'string' ? appUser.email : '';
        if (email) {
          localStorage.setItem('lifePlannerUser', JSON.stringify({ email, createdAt: Date.now() }));
        }
      } catch {
        // ignore
      }
    }

    // 2) Life Planner -> App (helps "without login" open LP and keeps header/profile consistent)
    if (!appToken && plannerToken) {
      localStorage.setItem('token', plannerToken);
    }

    if (!appUserRaw && plannerSessionRaw) {
      try {
        const plannerUser = JSON.parse(plannerSessionRaw);
        const email = typeof plannerUser?.email === 'string' ? plannerUser.email : '';
        if (email) {
          localStorage.setItem('user', JSON.stringify({ email, name: email.split('@')[0] || 'User' }));
        }
      } catch {
        // ignore
      }
    }

    const effectiveSession = localStorage.getItem('lifePlannerUser') || plannerSessionRaw;

    if (!effectiveSession || !effectiveToken) {
      // Token is required for Mongo-backed persistence; without it the API returns 401.
      router.push('/life-planner/login');
      return;
    }

    // Ensure the unified session has an expiry and refresh it on activity.
    ensureSessionExpiry();
    extendSession();

    setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main website header always on top */}
      <Navigation />

      {/* Life Planner UI sits below website header */}
      <div className="flex flex-1 min-h-0 bg-white">
        <LifePlannerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <LifePlannerTopNav sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-6 bg-white">{children}</main>
        </div>
      </div>
    </div>
  );
}
