'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const LifePlannerGoalsPage = dynamic(
  () => import('@/app/life-planner/dashboard/goals/page'),
  {
    loading: () => (
      <div className="min-h-[50vh] bg-swar-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    ),
  }
);

export default function CrmGoalsPage() {
  const router = useRouter();
  const token = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const crmToken = token || localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // Set token for life planner if available, but don't require CRM auth
    if (crmToken && user) {
      const existingLPToken = localStorage.getItem('lifePlannerToken');
      if (!existingLPToken) {
        localStorage.setItem('lifePlannerToken', crmToken);
      }
    }

    setIsReady(true);
  }, [token, router]);

  if (!isReady) {
    return (
      <div className="min-h-[50vh] bg-swar-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <LifePlannerGoalsPage />;
}
