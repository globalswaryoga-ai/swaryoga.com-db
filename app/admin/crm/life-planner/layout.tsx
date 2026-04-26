'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LifePlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verify CRM authentication
    const crmToken = token || localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!crmToken || !user) {
      router.replace('/admin/login');
      return;
    }

    // Set life planner token to CRM token so life planner pages work without separate login
    const existingLPToken = localStorage.getItem('lifePlannerToken');
    if (!existingLPToken && crmToken) {
      localStorage.setItem('lifePlannerToken', crmToken);
    }

    setIsReady(true);
  }, [token, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-swar-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}
