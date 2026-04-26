'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LifePlannerDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to goals (default tab in life planner dashboard)
    router.replace('/admin/crm/life-planner/goals');
  }, [router]);

  return (
    <div className="min-h-screen bg-swar-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-swar-text-secondary">Loading Life Planner…</p>
      </div>
    </div>
  );
}
