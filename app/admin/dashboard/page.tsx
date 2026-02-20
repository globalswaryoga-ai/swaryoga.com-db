'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /admin/dashboard now redirects to /admin/crm (Unified Dashboard)
 * All admin features have been merged into /admin/crm
 */
export default function AdminDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/crm');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-swar-bg">
      <div className="text-center">
        <p className="text-swar-text-secondary mb-2">Redirecting to Unified Dashboard...</p>
        <div className="animate-spin h-8 w-8 border-4 border-swar-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );
}
