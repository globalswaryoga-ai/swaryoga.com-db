'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "My Form" is consolidated into the single Ritucharya page (the frontend
 * experience). This route now redirects there to avoid a duplicate page.
 */
export default function MyFormRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/crm/planner-dashboard/ritucharya');
  }, [router]);
  return null;
}
