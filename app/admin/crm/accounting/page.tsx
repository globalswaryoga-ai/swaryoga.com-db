'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CrmAccountingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the life planner accounting page within CRM
    router.replace('/admin/crm/life-planner/accounting');
  }, [router]);

  return (
    <div className="min-h-screen bg-swar-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-swar-text-secondary">Loading Accounting…</p>
      </div>
    </div>
  );
}
