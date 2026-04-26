'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Target,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Calendar,
  Settings,
  Zap,
  DollarSign,
  Activity,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LifePlannerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const crmToken = token || localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!crmToken || !user) {
      router.replace('/admin/login');
      return;
    }

    const existingLPToken = localStorage.getItem('lifePlannerToken');
    if (!existingLPToken && crmToken) {
      localStorage.setItem('lifePlannerToken', crmToken);
    }

    setIsReady(true);
  }, [token, router]);

  const navTabs = [
    { label: 'Visions', href: '/admin/crm/life-planner/visions', icon: Target },
    { label: 'Goals', href: '/admin/crm/life-planner/goals', icon: CheckCircle2 },
    { label: 'Tasks', href: '/admin/crm/life-planner/tasks', icon: Zap },
    { label: 'Words', href: '/admin/crm/life-planner/words', icon: BookOpen },
    { label: 'Progress', href: '/admin/crm/life-planner/progress', icon: TrendingUp },
    { label: 'Calendar', href: '/admin/crm/life-planner/calendar', icon: Calendar },
    { label: 'Accounting', href: '/admin/crm/life-planner/accounting', icon: DollarSign },
    { label: 'Health Month', href: '/admin/crm/life-planner/health-month', icon: Activity },
    { label: 'Ritucharya', href: '/admin/crm/life-planner/ritucharya', icon: Home },
    { label: 'Settings', href: '/admin/crm/life-planner/settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-swar-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-swar-bg">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-swar-border sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    active
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-swar-text-secondary hover:text-swar-text hover:border-swar-border'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {children}
      </div>
    </div>
  );
}
